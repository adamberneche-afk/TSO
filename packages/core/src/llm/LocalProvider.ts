import { ILLMProvider } from './BaseProvider';

export class LocalProvider implements ILLMProvider {
  private baseUrl: string;
  private model: string;

  constructor(url: string, model: string) {
    this.baseUrl = url.replace(/\/$/, '');
    this.model = model;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async complete(systemPrompt: string, userPrompt: string): Promise<string> {
    const START_DELIMITER = "<<<START>>>";
    const END_DELIMITER = "<<<END>>>";

    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        stream: false,
        messages: [
          {
            role: "system",
            content: `${systemPrompt}. You MUST wrap your JSON response in ${START_DELIMITER} and ${END_DELIMITER} with NO conversational text outside these tags.`
          },
          { role: "user", content: userPrompt }
        ],
      })
    });

    if (!response.ok) {
      throw new Error(`Local LLM Error: ${response.statusText}`);
    }

    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content || "{}";

    const regex = new RegExp(`${START_DELIMITER}([\\s\\S]*?)${END_DELIMITER}`);
    const match = content.match(regex);

    if (match && match[1]) {
      return match[1].trim();
    }

    throw new Error(
      "LOCAL_LLM_PROTOCOL_VIOLATION: The Local AI model failed to output JSON within required delimiters. " +
      "Please ensure your model supports strict instruction following (e.g., llama3:instruct)."
    );
  }
}
