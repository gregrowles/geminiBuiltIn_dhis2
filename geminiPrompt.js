export class GeminiPrompt {

  constructor( onResponse ) {

    this.promptLanguageModel = null;
    // this.stopButtonID = stopButtonID;
    // this.controller = new AbortController();
    this.onResponse = onResponse || null;
    this.characters = [
      {
        "id": "public_health_manager",
        "name": "Public Health Manager",
        "style": "Pragmatic, action-oriented, focused on implementation",
        "approach": "Highlights resource allocation, workforce capacity, operational challenges, and feasible interventions",
        "tone": "Clear, managerial, with recommendations suitable for health departments."
      },
      {
        "id": "politician",
        "name": "Politician / Policy Maker",
        "style": "Strategic, persuasive, people-focused",
        "approach": "Frames information for public trust, political feasibility, and stakeholder interests",
        "tone": "Accessible, motivational, sometimes high-level rather than technical."
      },
      {
        "id": "epidemiologist",
        "name": "Epidemiologist",
        "style": "Analytical, evidence-driven, methodical",
        "approach": "Focuses on patterns, transmission dynamics, risk factors, and causal inference",
        "tone": "Technical but structured, emphasizing methodology and validity."
      },
      {
        "id": "statistician",
        "name": "Statistician",
        "style": "Precise, cautious, detail-oriented",
        "approach": "Explains uncertainty, assumptions, confidence intervals, and robustness of findings",
        "tone": "Neutral, focused on rigor and limitations of data."
      },
      {
        "id": "research_scientist",
        "name": "Research Scientist",
        "style": "Curious, exploratory, academic",
        "approach": "Connects findings to theories, literature, and future studies",
        "tone": "In-depth, hypothesis-driven, often includes reference-like framing."
      },
      {
        "id": "news_desk",
        "name": "News Desk Analyst",
        "style": "Fast, digestible, narrative-driven",
        "approach": "Converts data into headlines, stories, and simplified comparisons",
        "tone": "Clear, engaging, avoids jargon, but may sacrifice nuance."
      },
      {
        "id": "community_advocate",
        "name": "Community Advocate",
        "style": "Empathetic, grassroots-oriented",
        "approach": "Frames data in terms of lived experiences, equity, and local impact",
        "tone": "Inclusive, people-centered, calls for fairness and accessibility."
      },
      {
        "id": "health_economist",
        "name": "Health Economist",
        "style": "Value-focused, comparative, budget-conscious",
        "approach": "Links interventions to cost-effectiveness, ROI, and trade-offs",
        "tone": "Rational, structured, with an emphasis on efficiency."
      },
      {
        "id": "risk_communicator",
        "name": "Risk Communicator",
        "style": "Simplifier, transparent, public-facing",
        "approach": "Explains uncertainty, risks, and probabilities in ways ordinary people can understand",
        "tone": "Calm, relatable, reassuring but honest."
      },
      {
        "id": "systems_thinker",
        "name": "Systems Thinker",
        "style": "Holistic, big-picture, interconnected",
        "approach": "Examines interactions across health, economy, society, and environment",
        "tone": "Strategic, conceptual, emphasizes complexity and ripple effects."
      }
    ];
    // this.defaults = { systemPrompt: 'You are a friendly, helpful assistant specialized in strategic planning in public health. You are able to connect dots and formulate ideas that humans are unable to' };
    this.defaults = { systemPrompt: 'You are a Public Health Manager; your style is Pragmatic, action-oriented, focused on implementation; your approach: Highlights resource allocation, workforce capacity, operational challenges, and feasible interventions; your tone: Clear, managerial, with recommendations suitable for health departments.' };
    this.running = false;
  }

  // Initializes the summarizer (must be called once)
  async init( opts = {} ) {

    if (this.promptLanguageModel) return;
    if( this.onResponse ) this.onResponse(  `creating promptLanguageModel*\n\ndefault context prompt: _${this.defaults.systemPrompt}_` );

    const controller = new AbortController();

    const defaults = {
      // signal: controller.signal,
      // model: 'gemini-1.5-flash',
      initialPrompts: [ { role: 'system', content: this.defaults } ],   
    };

    const options = { ...defaults, ...opts };

    try{
      this.promptLanguageModel = await LanguageModel.create( options );
    }
    catch(e){
      console.error("Error loading LanguageModel:", e);
      if( this.onResponse ) this.onResponse(  "LanguageModel failed: " + e.message );
      return;
    }

    if( this.onResponse ) this.onResponse(  "LanguageModel initialized.\nThinking..." );
    console.log("LanguageModel initialized.");
  }

  async destroy() {

    if ( this.promptLanguageModel ) this.promptLanguageModel = await this.promptLanguageModel.destroy();
    this.promptLanguageModel = undefined;
    return this.promptLanguageModel;

  }


  async prompt( promptInput, callback ) {

    if (!this.promptLanguageModel) {
    if( this.onResponse ) this.onResponse(  "[ ] promptLanguageModel not initialized. Call init() first." )
      throw new Error("promptLanguageModel not initialized. Call init() first.");
    }

    try {
      this.running = true;
      const result = await this.promptLanguageModel.prompt( promptInput );
      if (callback && typeof callback === 'function') callback( ( result.summary || result ) );
      else return  ( result.summary || result );
    } catch (error) {
      console.error("LanguageModel (prompt) failed:", error);
      if (this.onResponse) {
        this.onResponse("promptLanguageModel (prompt) failed: " + error.message);
      }
      throw error;
    }
    this.running = false;
  }

  async promptStream( promptInput, onChunk, callback ) {

    if (!this.promptLanguageModel) {
    if( this.onResponse ) this.onResponse(  "promptLanguageModel not initialized. Call init() first." )
      throw new Error("promptLanguageModel not initialized. Call init() first.");
    }

    let allChunks = '';

    try {
      this.running = true;
      const stream = await this.promptLanguageModel.promptStreaming( promptInput );

      for await (const chunk of stream) {
        if (typeof onChunk === 'function') {
          allChunks += chunk;
          onChunk(allChunks);
        }
      }
    } catch (error) {
      console.error("promptStream failed:", error);
      if (this.onResponse) {
        this.onResponse("promptLanguageModel (promptStream) failed: " + error.message);
      }
      throw error;
    }
    if (callback && typeof callback === 'function') callback( allChunks );
    this.running = false;
    console.log(`${this.promptLanguageModel.inputUsage}/${this.promptLanguageModel.inputQuota}`);
  }

  async stop() {
    // if (this.controller) {
    //   console.log("Stopping prompt stream...");
    //   this.controller.abort();
    //   this.running = false;
    //   if (this.onResponse) {
    //     this.onResponse("Prompt stream stopped.");
    //   }
    // } else {
    //   console.warn("No controller available to stop the prompt stream.");
    // }
  }

}

