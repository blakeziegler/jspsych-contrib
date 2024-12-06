import { startTimeline } from "@jspsych/test-utils";

import jsPsychSummarizeLLM from ".";

describe("SummarizeLLMPlugin", () => {
  test("loads without errors", async () => {
    const { expectRunning } = await startTimeline([
      {
        type: jsPsychSummarizeLLM,
        preamble: "Test Preamble",
        questions: [
          {
            prompt: "This is a test question.",
            name: "test_question",
          },
        ],
        button_label: "Submit",
      },
    ]);

    await expectRunning(); // Ensures the plugin initializes and starts correctly
  });
});
