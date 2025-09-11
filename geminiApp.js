  // import { GeminiSummarizer } from './geminiSummarizer.js';
  // import { GeminiTranslator } from './geminiTranslator.js';
  // import { GeminiRewriter } from './geminiRewriter.js';
  import { GeminiPrompt } from './geminiPrompt.js';

  import * as markdownIt from 'https://esm.run/markdown-it';

  // hardCoded: fix
  const responseOutputControlID = 'responseOutput';

  // const summarizerInstance = new GeminiSummarizer( markdownOutput );
  // const translatorInstance = new GeminiTranslator( markdownOutput );
  // const rewriterInstance = new GeminiRewriter( markdownOutput );
  const promptLanguageModel = new GeminiPrompt( markdownOutput );

  
  // 1. bind "stop" button to controller (also show/hide accordingly)
  // 2. include option: use-as-chat (where responses are appended to the chat history)

  function markdownOutput ( chunk ) {

    const md = markdownit()
    const html = md.render(chunk);
    const targetEl = document.getElementById( responseOutputControlID );

    if (!targetEl) {
        console.error(`Element with ID "${targetElementId}" not found.`);
        return;
    }

    targetEl.innerHTML = html;
    targetEl.scrollTop = targetEl.scrollHeight;
  }

  function markdownReturn ( chunk ) {

    const md = markdownit()

    return md.render(chunk);

  }


  // Function to run the summarizer
  // async function runSummarizer ( inpText, callback ) {

  //   await summarizerInstance.init();

  //   const summary = await summarizerInstance.summarize( inpText );

  //   markdownOutput( summary );

  //   if ( callback && typeof callback === 'function') {

  //     callback( { id: generateRandomId(15), type: 'S', input: inpText, response: summary } );

  //   }

  // }
  // async function runSummarizerStream ( inpText, callback ) {

  //   await summarizerInstance.init();

  //   await summarizerInstance.summarizeStream( inpText, 'intended for health managers', markdownOutput, ( streamFinal ) => {

  //     if ( callback && typeof callback === 'function') {

  //       callback( { id: generateRandomId(15), type: 'Ss', input: inpText, response: streamFinal } );

  //     }

  //   });

  // }

  // // Function to run the translator
  // async function runTranslator ( inpText, callback ) {

  //   await translatorInstance.init( document.getElementById('languageFrom') ? document.getElementById('languageFrom').value : 'en', document.getElementById('languageTo') ? document.getElementById('languageTo').value : 'fr' );

  //   const summary = await translatorInstance.translate( inpText );

  //   markdownOutput( summary );

  //     if ( callback && typeof callback === 'function') {

  //       callback( { id: generateRandomId(15), type: 'T', input: inpText, response: summary } );

  //     }

  // }

  // // Function to run the rewriter
  // async function runRewriter ( inpText, callback ) {

  //   await rewriterInstance.init();

  //   const summary = await rewriterInstance.rewrite( inpText );

  //   markdownOutput( summary );

  //   if ( callback && typeof callback === 'function') {

  //     callback( { id: generateRandomId(15), type: 'R', input: inpText, response: summary } );

  //   }

  // }

  // Function to run the prompt
  async function runPrompt ( inpText, callback ) {

    await promptLanguageModel.init();

    await promptLanguageModel.prompt( inpText , ( summary ) => {

      markdownOutput( summary );

      if ( callback && typeof callback === 'function') {

        callback( { id: generateRandomId(15), type: 'P', input: inpText, response: summary } );

      }

    });

  }
  async function runPromptStream ( inpText, callback ) {

    await promptLanguageModel.init();

    await promptLanguageModel.promptStream( inpText, markdownOutput, ( streamFinal ) => {

      if ( callback && typeof callback === 'function') {

        callback( { id: generateRandomId(15), type: 'Ps', input: inpText, response: streamFinal } );

      }

    });

  }
  async function runPromptStreamJsonInput ( inpObj, callback ) {

    if ( typeof inpObj === 'object' && inpObj?.defaultPrompt ) promptLanguageModel.defaults.systemPrompt = inpObj.defaultPrompt;

    await promptLanguageModel.init();

    await promptLanguageModel.promptStream( inpObj.prompt, markdownOutput, ( streamFinal ) => {

      if ( callback && typeof callback === 'function') {

        var cloneData = JSON.parse( JSON.stringify( inpObj ) );

        cloneData[ 'id' ] = generateRandomId(15);
        cloneData[ 'type' ] = 'Ps';
        cloneData[ 'response' ] = streamFinal;

        // callback( { id: generateRandomId(15), type: 'Ps', input: inpObj.prompt, response: streamFinal } );
        callback( cloneData );

      }

    });

  }

  // Function to run the api fetch
  async function testAPIurl ( args, callback ) {
  
    console.log('testAPIurl called with args:', args);
    let _headers = { 'Content-Type': args?.contentType || 'application/json' };
    let _body = args?.body ? args?.body : null;

    if ( args?.username?.length && args?.password?.length ) {
      const encodedCredentials = btoa( args.username + ':' + args.password );
      _headers['Authorization'] = 'Basic ' + encodedCredentials;
    }

    if ( args?.accessToken ) {
      const encodedCredentials = btoa( args.username + ':' + args.password );
      _headers['Authorization'] = 'Bearer ' + encodedCredentials;
    }

    try{
      const response = await fetch( args?.url, {
        method: args?.method || 'GET',
        headers: _headers,
        body: _body
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Login successful:', data);
        callback( data );
      } else {
        console.error('Login failed:', response.status, response.statusText);
        callback( { error: 'Fetch failed', status: response.status, statusText: response.statusText } );
      }
    }
    catch(e){
      console.error('Error during fetch:', e);
      callback( { error: e.message } );
      return;
    }
    
  
}


  async function destroyLanguageModel() {
    promptLanguageModel.destroy();
  }

  
  async function aboutGemini( ) {

    // const inputText = document.getElementById('geminiInputText').value;
    // const output = document.getElementById('responseOutput');
    // output.textContent = 'Checking...';

    setTimeout(() => {
      let result =  '**Gemini Nano** \n\n' +
                    ' The following list of features are available/enabled on your machine: \n' +
                    '| Feature | Supported | Purpose |\n'+
                    '| --- | --- | --- |\n' +
                  //  '| Summarize | ${( 'Summarizer' in self ? '&#10003;' : ' ' )} | Summarizing narratives, articles or messages |\n' +
                    '| Summarize | ' + ( 'Summarizer' in self ? '&#10003;' : ' ' ) + ' | Summarizing narratives, articles or messages|\n' +
                    '| Translate (en - fr) | ' + ( 'Translator' in self ? '&#10003;' : ' ' ) + ' | Translation of texts into other langages (en-fr defaulted) |\n' +
                    '| Rewrite | ' + ( 'Rewriter' in self ? '&#10003;' : ' ' ) + ' | Rewrite texts to sound more polite or formal |\n' +
                  //  '| Prompt | ${( 'prompt' in self ? '&#10003;' : ' ' )} |\n' +
                    '| Prompt | ' + ( 'prompt' in self ? '&#10003;' : ' ' ) + ' | Answer questions based on provided texts or general Q&A|\n\n' +
                    '**Getting Started** \n\n' + 
                    'Gemini (Nano) is an experimental AI feature (under Chrome)\n' + 
                    'How to Enable Foundational Model (e.g. v2Nano) \n' + 
                    '1. Copy reserved URL _chrome://flags/#prompt-api-for-gemini-nano_ and paste into new tab \n' + 
                    '2. Enable feature and restart chrome \n\n' +
                    'Note: Individual features may require separate settings to be enabled ([rewriter](chrome://flags/#rewriter-api-for-gemini-nano));' + 
                    'visit developer site to [Learn more](https://developer.chrome.com/docs/ai/get-started) \n\n' +
                    '**Operating system**\n\nWindows 10 or 11; macOS 13+ (Ventura and onwards); or Linux. Chrome for Android, iOS, and ChromeOS are not yet supported by the APIs which use Gemini Nano.  \n' +
                    '**Storage**\n\nAt least 22 GB of free space on the volume that contains your Chrome profile  \n';

      // output.innerHTML = "<div class='floatOutput'>" + window.markdownReturn( result ) + "</div>";
      markdownOutput( result );
    }, 100);
  }


  function generateRandomId(length = 10) {
    return Math.random().toString(36).substring(2, length + 2);
  }



  // Expose functions to the global scope
  window.promptCharacters = promptLanguageModel.characters;
  // window.runSummarizer = runSummarizer;
  // window.runSummarizerStream = runSummarizerStream;   
  // window.runTranslator = runTranslator;
  // window.runRewriter = runRewriter;
  window.runPrompt = runPrompt;
  window.runPromptStream = runPromptStream;
  window.runPromptStreamJsonInput = runPromptStreamJsonInput;
  window.destroyLanguageModel = destroyLanguageModel;
  window.testAPIurl = testAPIurl;
  window.markdownReturn = markdownReturn;
  window.markdownOutput = markdownOutput;
  window.aboutGemini = aboutGemini;
