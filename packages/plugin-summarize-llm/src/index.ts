import { JsPsych, JsPsychPlugin, ParameterType, TrialType } from "jspsych";
declare var wordVecs: { [key: string]: number[] }; // Declare `wordVecs` to satisfy TypeScript

const info = <const>{
  name: "summarize-llm",
  version: "1.0.0",
  parameters: {
    questions: {
      type: ParameterType.COMPLEX,
      array: true,
      pretty_name: "Questions",
      default: [],
      nested: {
        prompt: { type: ParameterType.HTML_STRING, pretty_name: "Prompt", default: "" },
        name: { type: ParameterType.STRING, pretty_name: "Question Name", default: "" },
        placeholder: { type: ParameterType.STRING, pretty_name: "Placeholder", default: "" },
        rows: { type: ParameterType.INT, pretty_name: "Rows", default: 1 },
        columns: { type: ParameterType.INT, pretty_name: "Columns", default: 40 },
        required: { type: ParameterType.BOOL, pretty_name: "Required", default: false },
      },
    },
    preamble: { type: ParameterType.HTML_STRING, pretty_name: "Preamble", default: null },
    button_label: { type: ParameterType.STRING, pretty_name: "Button label", default: "Submit" },
  },
};

type Info = typeof info;

class SummarizeLLMPlugin implements JsPsychPlugin<Info> {
  static info = info;

  constructor(private jsPsych: JsPsych) {}

  trial(display_element: HTMLElement, trial: TrialType<Info>) {
    console.log("Rendering...");

    // Build the HTML for the trial
    let html = trial.preamble
      ? `<div id="jspsych-summarize-llm-preamble">${trial.preamble}</div>`
      : "";
    html += `<form id="jspsych-summarize-llm-form">`;
    trial.questions.forEach((question, i) => {
      html += `
        <div>
          <p>${question.prompt}</p>
          <textarea id="input-${i}" rows="${question.rows}" cols="${question.columns}" 
          placeholder="${question.placeholder}"></textarea>
          <div id="response-${i}" class="response-feedback"></div>
        </div>`;
    });
    html += `<button type="submit">${trial.button_label}</button></form>`;
    display_element.innerHTML = html;

    // Add event listener for form submission
    display_element.querySelector("form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const response_data: Record<string, { response: string; similarity: number }> = {};
      trial.questions.forEach((question, i) => {
        const input = display_element.querySelector(`#input-${i}`) as HTMLTextAreaElement;
        const response = input.value || "";
        const similarity = this.getSimilarity(question.prompt, response);
        const feedbackElement = display_element.querySelector(`#response-${i}`) as HTMLElement;

        // Provide feedback based on similarity
        if (similarity < 0.8) {
          feedbackElement.textContent = "Your response could be more aligned with the prompt.";
          feedbackElement.style.color = "red";
        }
        if (similarity > 0.95) {
          feedbackElement.textContent = "Your response is too similar, remember to summarize.";
          feedbackElement.style.color = "red";
        } else {
          feedbackElement.textContent = "Good response!";
          feedbackElement.style.color = "green";
        }

        response_data[question.name || `Q${i + 1}`] = { response, similarity };
      });

      this.jsPsych.finishTrial({ response_data });
    });
  }

  private getSimilarity(doc1: string, doc2: string): number {
    const vec1 = this.averageVector(this.cleanInput(doc1));
    const vec2 = this.averageVector(this.cleanInput(doc2));
    return this.cosineSimilarity(vec1, vec2);
  }

  private cleanInput(text: string): string[] {
    // Normalize the text: lowercase, remove punctuation/numbers
    const normalizedText = text.toLowerCase().replace(/[\d\W_]+/g, " ");
    // Filter out words not present in wordVecs
    return normalizedText.split(/\s+/).filter((word) => wordVecs[word]);
  }

  private averageVector(words: string[]): number[] {
    // Initialize a vector with 0s
    const sumVector = new Array(300).fill(0);
    let count = 0;

    words.forEach((word) => {
      if (wordVecs[word]) {
        count++;
        const vec = wordVecs[word];
        for (let i = 0; i < sumVector.length; i++) {
          sumVector[i] += vec[i];
        }
      }
    });

    // Return average or zeros if no words matched
    return count === 0 ? sumVector : sumVector.map((val) => val / count);
  }

  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
    const magnitude1 = Math.sqrt(vec1.reduce((sum, val) => sum + val ** 2, 0));
    const magnitude2 = Math.sqrt(vec2.reduce((sum, val) => sum + val ** 2, 0));
    return magnitude1 && magnitude2 ? dotProduct / (magnitude1 * magnitude2) : 0;
  }
}

export default SummarizeLLMPlugin;
