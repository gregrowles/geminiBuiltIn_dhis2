export class GeminiPrompt {
  // Store the list of characters statically to prevent memory bloat on instantiation
  static get CHARACTERS() {
    return [
      {
        id: "public_health_manager",
        name: "Public Health Manager",
        style: "Pragmatic, action-oriented, focused on implementation",
        approach: "Highlights resource allocation, workforce capacity, operational challenges, and feasible interventions",
        tone: "Clear, managerial, with recommendations suitable for health departments."
      },
      {
        id: "politician",
        name: "Politician / Policy Maker",
        style: "Strategic, persuasive, people-focused",
        approach: "Frames information for public trust, political feasibility, and stakeholder interests",
        tone: "Accessible, motivational, sometimes high-level rather than technical."
      },
      {
        id: "epidemiologist",
        name: "Epidemiologist",
        style: "Analytical, evidence-driven, methodical",
        approach: "Focuses on patterns, transmission dynamics, risk factors, and causal inference",
        tone: "Technical but structured, emphasizing methodology and validity."
      },
      {
        id: "statistician",
        name: "Statistician",
        style: "Precise, cautious, detail-oriented",
        approach: "Explains uncertainty, assumptions, confidence intervals, and robustness of findings",
        tone: "Neutral, focused on rigor and limitations of data."
      },
      {
        id: "research_scientist",
        name: "Research Scientist",
        style: "Curious, exploratory, academic",
        approach: "Connects findings to theories, literature, and future studies",
        tone: "In-depth, hypothesis-driven, often includes reference-like framing."
      },
      {
        id: "news_desk",
        name: "News Desk Analyst",
        style: "Fast, digestible, narrative-driven",
        approach: "Converts data into headlines, stories, and simplified comparisons",
        tone: "Clear, engaging, avoids jargon, but may sacrifice nuance."
      },
      {
        id: "community_advocate",
        name: "Community Advocate",
        style: "Empathetic, grassroots-oriented",
        approach: "Frames data in terms of lived experiences, equity, and local impact",
        tone: "Inclusive, people-centered, calls for fairness and accessibility."
      },
      {
        id: "health_economist",
        name: "Health Economist",
        style: "Value-focused, comparative, budget-conscious",
        approach: "Links interventions to cost-effectiveness, ROI, and trade-offs",
        tone: "Rational, structured, with an emphasis on efficiency."
      },
      {
        id: "risk_communicator",
        name: "Risk Communicator",
        style: "Simplifier, transparent, public-facing",
        approach: "Explains uncertainty, risks, and probabilities in ways ordinary people can understand",
        tone: "Calm, relatable, reassuring but honest."
      },
      {
        id: "systems_thinker",
        name: "Systems Thinker",
        style: "Holistic, big-picture, interconnected",
        approach: "Examines interactions across health, economy, society, and environment",
        tone: "Strategic, conceptual, emphasizes complexity and ripple effects."
      }
    ];
  }

  constructor(onResponse) {
    this.promptLanguageModel = null;
    this.onResponse = onResponse || null;
    this.controller = null; // Instantiated per streaming session
    this.running = false;
    this.AILanguageModelSamplingMode = [
      "most-predictable", // For strict consistency/factual extraction
      "predictable",      // For highly focused outputs
      "balanced",         // The default state for standard prompting
      "creative",         // For tasks favoring variety over strict facts
      "most-creative"     // For maximum token diversity and brainstorming
    ];

    // Default to the first character ('public_health_manager')
    const defaultChar = GeminiPrompt.CHARACTERS[0];
    this.defaults = {
      systemPrompt: `You are a ${defaultChar.name}; your style is ${defaultChar.style}; your approach: ${defaultChar.approach}; your tone: ${defaultChar.tone}`
    };
  }

  // Allow global window context to access characters seamlessly
  get characters() {
    return GeminiPrompt.CHARACTERS;
  }

  /**
   * Initializes the LanguageModel (should be called once)
   */
  async init(opts = {}) {
    if (this.promptLanguageModel) return;

    this.log(`creating promptLanguageModel*\n\ndefault context prompt: _${this.defaults.systemPrompt}_`);

    // Clean initial Prompts format: content expects a string, not the defaults object
    const defaults = {
      initialPrompts: [{ role: 'system', content: this.defaults.systemPrompt }],
      samplingMode: this.AILanguageModelSamplingMode[0]
    };

    const options = { ...defaults, ...opts };

    try {
      this.promptLanguageModel = await LanguageModel.create(options);
      this.log("LanguageModel initialized.\nThinking...");
      console.log("LanguageModel initialized.");
    } catch (error) {
      console.error("Error loading LanguageModel:", error);
      this.log(`LanguageModel failed: ${error.message}`);
    }
  }

  /**
   * Destroys current model instance
   */
  async destroy() {
    if (this.promptLanguageModel) {
      await this.promptLanguageModel.destroy();
    }
    this.promptLanguageModel = null;
    this.running = false;
  }

  /**
   * Executes a non-streamed prompt
   */
  async prompt(promptInput, callback) {
    this.ensureInitialized();

    try {
      this.running = true;
      this.controller = new AbortController();

      // Pass the signal down so the prompt can be aborted if needed
      const result = await this.promptLanguageModel.prompt(promptInput, {
        signal: this.controller.signal
      });

      const responseText = result.summary || result;

      if (typeof callback === 'function') {
        callback(responseText);
      }
      return responseText;
    } catch (error) {
      if (error.name === 'AbortError') {
        this.log("Prompt cancelled by user.");
      } else {
        console.error("LanguageModel (prompt) failed:", error);
        this.log(`promptLanguageModel (prompt) failed: ${error.message}`);
      }
      throw error;
    } finally {
      this.running = false;
    }
  }

  /**
   * Executes a streamed prompt, allowing chunks to render incrementally
   */
  async promptStream(promptInput, onChunk, callback) {
    this.ensureInitialized();

    let allChunks = '';
    try {
      this.running = true;
      this.controller = new AbortController();

      // Pass the abort signal into the stream generator
      const stream = await this.promptLanguageModel.promptStreaming(promptInput, {
        signal: this.controller.signal
      });

      for await (const chunk of stream) {
        allChunks += chunk;
        if (typeof onChunk === 'function') {
          onChunk(allChunks);
        }
      }

      if (typeof callback === 'function') {
        callback(allChunks);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        this.log("Prompt stream stopped.");
      } else {
        console.error("promptStream failed:", error);
        this.log(`promptLanguageModel (promptStream) failed: ${error.message}`);
      }
      throw error;
    } finally {
      this.running = false;
      this.logUsage();
    }
  }

  /**
   * Aborts any running prompt request
   */
  async stop() {
    if (this.controller && this.running) {
      console.log("Stopping prompt execution...");
      this.controller.abort();
      this.running = false;
    } else {
      console.warn("No active stream to stop.");
    }
  }

  // Helper: Enforce instance safety checks
  ensureInitialized() {
    if (!this.promptLanguageModel) {
      const errMsg = "promptLanguageModel not initialized. Call init() first.";
      this.log(`[ ] ${errMsg}`);
      throw new Error(errMsg);
    }
  }

  // Helper: Safe callback-based UI logging
  log(message) {
    if (typeof this.onResponse === 'function') {
      this.onResponse(message);
    }
  }

  // Helper: Log usage status safely without breaking when fields are undefined
  logUsage() {
    const usage = this.promptLanguageModel?.contextUsage;
    const quota = this.promptLanguageModel?.contextWindow;
    if (usage !== undefined && quota !== undefined) {
      console.log(`${usage}/${quota}`);
    }
  }
}
