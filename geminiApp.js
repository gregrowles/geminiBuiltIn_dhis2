import { GeminiPrompt } from './geminiPrompt.js';
import MarkdownIt from 'https://esm.run/markdown-it'; // Fixed import syntax

// Initialize markdown-it once globally to avoid recreating the instance on every call
const md = new MarkdownIt();

// Hardcoded configurations
const RESPONSE_OUTPUT_CONTROL_ID = 'responseOutput';
const promptLanguageModel = new GeminiPrompt(markdownOutput);

/**
 * Renders markdown chunk to the output container and handles auto-scrolling
 */
function markdownOutput(chunk) {
  const html = md.render(chunk);
  const targetEl = document.getElementById(RESPONSE_OUTPUT_CONTROL_ID);

  if (!targetEl) {
    console.error(`Element with ID "${RESPONSE_OUTPUT_CONTROL_ID}" not found.`);
    return;
  }

  targetEl.innerHTML = html;
  targetEl.scrollTop = targetEl.scrollHeight;

  // DHIS2 iframe context smooth scrolling
  const parentDocument = window.parent?.document;
  const parentFrame = parentDocument?.querySelector('.app-shell-app');
  if (parentFrame) {
    parentFrame.scrollTo({ top: parentFrame.scrollHeight, left: 0, behavior: 'smooth' });
  }
}

/**
 * Returns rendered HTML from a markdown string
 */
function markdownReturn(chunk) {
  return md.render(chunk);
}

/**
 * Standard Prompt Execution
 */
async function runPrompt(inpText, callback) {
  try {
    await promptLanguageModel.init();
    await promptLanguageModel.prompt(inpText, (summary) => {
      markdownOutput(summary);
      if (typeof callback === 'function') {
        callback({ id: generateRandomId(15), type: 'P', input: inpText, response: summary });
      }
    });
  } catch (error) {
    console.error('Error running prompt:', error);
  }
}

/**
 * Streamed Prompt Execution
 */
async function runPromptStream(input, callback) {
  try {
    // Fixed: Handled cases where input might be passed as an object containing options
    const text = typeof input === 'object' ? input.prompt : input;
    const options = typeof input === 'object' ? input.options : undefined;

    await promptLanguageModel.init(options);
    await promptLanguageModel.promptStream(text, markdownOutput, (streamFinal) => {
      if (typeof callback === 'function') {
        callback({ id: generateRandomId(15), type: 'Ps', input: text, response: streamFinal });
      }
    });
  } catch (error) {
    console.error('Error running prompt stream:', error);
  }
}

/**
 * Streamed Prompt Execution with JSON Input
 */
async function runPromptStreamJsonInput(inpObj, callback) {
  try {
    if (typeof inpObj === 'object' && inpObj?.defaultPrompt) {
      promptLanguageModel.defaults.systemPrompt = inpObj.defaultPrompt;
    }

    await promptLanguageModel.init(inpObj?.options);
    await promptLanguageModel.promptStream(inpObj.prompt, markdownOutput, (streamFinal) => {
      if (typeof callback === 'function') {
        // Replaced expensive JSON stringify/parse with modern spread operator
        const responseData = {
          ...inpObj,
          id: generateRandomId(15),
          type: 'Ps',
          response: streamFinal
        };
        callback(responseData);
      }
    });
  } catch (error) {
    console.error('Error running JSON prompt stream:', error);
  }
}

/**
 * Generic API Fetch Utility
 */
async function testAPIurl(args, callback) {
  console.log('testAPIurl called with args:', args);
  
  const headers = { 'Content-Type': args?.contentType || 'application/json' };
  const body = args?.body || null;

  if (args?.username && args?.password) {
    headers['Authorization'] = `Basic ${btoa(`${args.username}:${args.password}`)}`;
  } else if (args?.accessToken) {
    // Fixed: Bearer token logic previously used username/password by mistake
    headers['Authorization'] = `Bearer ${args.accessToken}`;
  }

  try {
    const response = await fetch(args?.url, {
      method: args?.method || 'GET',
      headers,
      body
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Fetch successful:', data);
      callback(data);
    } else {
      console.error('Fetch failed:', response.status, response.statusText);
      callback({ error: 'Fetch failed', status: response.status, statusText: response.statusText });
    }
  } catch (error) {
    console.error('Error during fetch:', error);
    callback({ error: error.message });
  }
}

async function destroyLanguageModel() {
  if (typeof promptLanguageModel.destroy === 'function') {
    promptLanguageModel.destroy();
  }
}

/**
 * Outputs information about the current Gemini Environment
 */
function aboutGemini() {
  setTimeout(() => {
    // Replaced messy string concatenation with a clean template literal
    const isSummarizerAvail = 'Summarizer' in self ? '&#10003;' : ' ';
    const isTranslatorAvail = 'Translator' in self ? '&#10003;' : ' ';
    const isRewriterAvail = 'Rewriter' in self ? '&#10003;' : ' ';
    const isPromptAvail = 'prompt' in self ? '&#10003;' : ' ';

    const result = `**Gemini Nano**

The following list of features are available/enabled on your machine:
| Feature | Supported | Purpose |
| --- | --- | --- |
| Summarize | ${isSummarizerAvail} | Summarizing narratives, articles or messages |
| Translate (en - fr) | ${isTranslatorAvail} | Translation of texts into other langages (en-fr defaulted) |
| Rewrite | ${isRewriterAvail} | Rewrite texts to sound more polite or formal |
| Prompt | ${isPromptAvail} | Answer questions based on provided texts or general Q&A |

**Getting Started**

Gemini (Nano) is an experimental AI feature (under Chrome).
How to Enable Foundational Model (e.g. v2Nano):
1. Copy reserved URL _chrome://flags/#prompt-api-for-gemini-nano_ and paste into new tab 
2. Enable feature and restart chrome 

Note: Individual features may require separate settings to be enabled ([rewriter](chrome://flags/#rewriter-api-for-gemini-nano)); visit developer site to [Learn more](https://developer.chrome.com/docs/ai/get-started).

**Operating system**
Windows 10 or 11; macOS 13+ (Ventura and onwards); or Linux. Chrome for Android, iOS, and ChromeOS are not yet supported by the APIs which use Gemini Nano.

**Storage**
At least 22 GB of free space on the volume that contains your Chrome profile.`;

    markdownOutput(result);
  }, 100);
}

function generateRandomId(length = 10) {
  return Math.random().toString(36).substring(2, length + 2);
}

// Expose functions to the global scope
window.promptCharacters = promptLanguageModel.characters;
window.runPrompt = runPrompt;
window.runPromptStream = runPromptStream;
window.runPromptStreamJsonInput = runPromptStreamJsonInput;
window.destroyLanguageModel = destroyLanguageModel;
window.testAPIurl = testAPIurl;
window.markdownReturn = markdownReturn;
window.markdownOutput = markdownOutput;
window.aboutGemini = aboutGemini;
