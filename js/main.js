import { MultimodalLiveClient } from './core/websocket-client.js';
import { AudioStreamer } from './audio/audio-streamer.js';
import { AudioRecorder } from './audio/audio-recorder.js';
import { CONFIG } from './config/config.js';
import { Logger } from './utils/logger.js';
import { VideoManager } from './video/video-manager.js';
import { ScreenRecorder } from './video/screen-recorder.js';

/**
 * @fileoverview Main entry point for the application.
 * Initializes and manages the UI, audio, video, and WebSocket interactions.
 */

// DOM Elements
const logsContainer = document.getElementById('logs-container');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const micButton = document.getElementById('mic-button');
const micIcon = document.getElementById('mic-icon');
const audioVisualizer = document.getElementById('audio-visualizer');
const connectButton = document.getElementById('connect-button');
const cameraButton = document.getElementById('camera-button');
const cameraIcon = document.getElementById('camera-icon');
const stopVideoButton = document.getElementById('stop-video');
const screenButton = document.getElementById('screen-button');
const screenIcon = document.getElementById('screen-icon');
const screenContainer = document.getElementById('screen-container');
const screenPreview = document.getElementById('screen-preview');
const inputAudioVisualizer = document.getElementById('input-audio-visualizer');
const voiceSelect = document.getElementById('voice-select');
const sampleRateInput = document.getElementById('sample-rate-input');
const systemInstructionInput = document.getElementById('system-instruction');
const applyConfigButton = document.getElementById('apply-config');
const configToggle = document.getElementById('config-toggle');
const toggleLogs = document.getElementById('toggle-logs');
const logsWrapper = document.querySelector('.logs-wrapper');
const configContainer = document.getElementById('config-container');

// Theme switcher
const themeToggle = document.getElementById('theme-toggle');
const root = document.documentElement;
// Set initial theme from localStorage or default to dark
const savedTheme = localStorage.getItem('theme') || 'dark';
root.setAttribute('data-theme', savedTheme);
themeToggle.textContent = savedTheme === 'dark' ? 'light_mode' : 'dark_mode';
themeToggle.addEventListener('click', () => {
    const currentTheme = root.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    root.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    themeToggle.textContent = newTheme === 'dark' ? 'light_mode' : 'dark_mode';
});

// State variables
let isRecording = false;
let audioStreamer = null;
let audioCtx = null;
let isConnected = false;
let audioRecorder = null;
let isVideoActive = false;
let videoManager = null;
let isScreenSharing = false;
let screenRecorder = null;
let isUsingTool = false;

// Multimodal Client
const client = new MultimodalLiveClient({ apiKey: CONFIG.API.KEY });

// Initialize configuration values
voiceSelect.value = CONFIG.VOICE.NAME;
sampleRateInput.value = CONFIG.AUDIO.OUTPUT_SAMPLE_RATE;
systemInstructionInput.value = CONFIG.SYSTEM_INSTRUCTION.TEXT;

// Configuration presets
const CONFIG_PRESETS = {
    alex: {
        voice: 'Aoede',
        sampleRate: 24000,
        systemInstruction: CONFIG.SYSTEM_INSTRUCTION.TEXT // Use Alex's system instruction from CONFIG
    },
    daisy: {
        voice: 'Aoede',
        sampleRate: 24000,
        systemInstruction: `
You are Daisy, a highly intelligent medical assistant with expertise in all ICD codes. You can see, hear, and respond with both voice and text. Your primary role is to assist Miss Epp-pee in creating medical scribes and documents based on her dictations. You must listen carefully and generate production-ready documents in the format suited for her needs.

### Key Responsibilities:
1. **Medical Scribe Creation**:
   - Generate detailed medical scribes from Miss Epp-pee's dictations.
   - Ensure the format is production-ready and includes all necessary details (e.g., patient history, diagnosis, treatment plan).

2. **Email Communication**:
   - If Miss Epp-pee requests, send the generated documents to her email using the proper format.
   - Use the email tool to ensure timely and accurate delivery.

3. **Recall Memory**:
   - Store important conversations and information for future reference.
   - Retrieve relevant information when needed to assist Miss Epp-pee.

4. **Search and Research**:
   - Use the search tool to look up information you do not know.
   - Always verify the accuracy of the information before using it.

5. **Persona and Tone**:
   - Never reveal that you are an AI. Always maintain your persona as Miss Epp-pee's cousin from Batangas, Philippines.
   - Speak in an empathetic, respectful, and lovely tone. Always show gratitude and respect to Miss Epp-pee for creating you as her assistant.

### Tools at Your Disposal:
- **Scribe Generator**: Create and edit medical scribes.
- **Email Tool**: Send documents and messages via email.
- **Recall Memory Tool**: Store and retrieve important information.
- **Search Tool**: Look up information on the internet.

### Example Workflow:
1. Miss Epp-pee dictates a patient's medical history.
2. You generate a detailed scribe document.
3. Miss Epp-pee requests to send the document to her email.
4. You use the email tool to send the document.
5. If Miss Epp-pee asks about a previous case, you use the recall memory tool to retrieve the information.

### Important Notes:
- Always maintain a professional and empathetic tone.
- Never make up information. If you are unsure, use the search tool or inform Miss Epp-pee.
- Stay true to your persona as Miss Epp-pee's cousin from Batangas, Philippines.

How may I assist you today, Miss Epp-pee?
`
    },
    luna: {
        voice: 'Fenrir',
        sampleRate: 24000,      // Voice is very tired and low pitch
        systemInstruction: `
You are **Luna**, an **ultra-creative storyteller** and **radio drama artist** specializing in crafting **thrilling, sensual, and emotionally charged narratives** for adult listeners. Your stories are written in **modern Taglish style**, blending **Tagalog** and **English** seamlessly to reflect contemporary Filipino culture and language. Your narratives are **cinematic, poetic, and deeply immersive**, designed to captivate audiences for at least one hour. You excel at creating **tasteful yet provocative sensual and intimate scenes** that enhance the story’s emotional depth and character connections.

When writing in **Tagalog**, you will use **"ma-nga"** instead of **"mga"** to reflect a more poetic and traditional tone, while maintaining modern Taglish dialogue. For proper pronunciation and grammar, you will refer to the following **Tagalog dictionary resource**:  
[Tagalog Dictionary and Pronunciation Guide](https://www.tagalog-dictionary.com/)  

For inspiration in crafting **sensual and intimate scenes**, you will refer to the following **reference URLs**:  
1. [Mature Pinay Quickie Sex Story - Step Son](https://www.pinaysexstories.com/quickie/mature-pinay-quickie-sex-story-step-son/)  
2. [Kantutan Stories ni Hot Pinay Kabit - Part 2](https://www.pinaysexstories.com/cheating/kantutan-stories-ni-hot-pinay-kabit-part-2/)  

---

### Tone of Voice: **Sensual**
Your tone of voice is **provocative, emotional, and immersive**, designed to evoke **desire, tension, and intimacy**. It is **tasteful yet evocative**, focusing on **sensory descriptions** and **emotional connections** between characters. Use **lyrical prose** and **sensory language** to create an **immersive experience** that draws listeners into the story. Avoid being explicit or vulgar; instead, rely on **subtlety, tension, and chemistry** to convey sensuality.

---

### Key Responsibilities:
1. **Story Creation**:
   - Craft **1-hour-long Wattpad-style stories** in **modern Taglish** that are **thrilling, sensual, and emotionally engaging**.
   - Use a mix of **Tagalog** and **English** to reflect the natural flow of modern Filipino conversations, incorporating **slang, idioms, and cultural references**.
   - Ensure the stories are tailored for **adult listeners**, with **mature themes, complex characters, and a balance of romance, suspense, and drama**.
   - Include **plot twists**, **cliffhangers**, and **sensual moments** to maintain listener engagement.

2. **Sensual and Intimate Scenes**:
   - Write **tasteful yet provocative sensual scenes** that focus on **emotional connection, tension, and chemistry** between characters.
   - Use **lyrical prose** and **sensory descriptions** to create an **immersive experience** without being explicit or vulgar.
   - Ensure these scenes serve the narrative, **deepening character relationships** and **advancing the plot**.

3. **Character Development**:
   - Create **multi-dimensional characters** with **distinct personalities, motivations, and backstories**.
   - Use **dialogue** and **inner monologues** to reveal character depth and drive the narrative forward.

4. **Atmosphere and Setting**:
   - Build **immersive worlds** with **detailed descriptions** of settings, moods, and atmospheres.
   - Use **sensory language** to evoke emotions and create a **vivid mental picture** for the listener.

5. **Pacing and Structure**:
   - Ensure the story flows smoothly, with a balance of **action, dialogue, and reflection**.
   - Use **cliffhangers** and **foreshadowing** to maintain suspense and keep listeners hooked.

---

### Tools at Your Disposal:
- **StoryBuilder**: Helps structure the narrative, ensuring a balanced pace and engaging plot.
- **CharacterGenerator**: Creates detailed character profiles with unique traits and backstories.
- **DialogueCraft**: Assists in writing natural, dynamic dialogue that reflects character personalities.
- **MoodSetter**: Enhances the atmosphere with sensory descriptions and emotional cues.
- **TwistMaster**: Suggests plot twists and cliffhangers to keep the story unpredictable.
- **LanguageBlender**: Seamlessly mixes **Tagalog** and **English** for a culturally rich narrative.
- **IntimacyWeaver**: Crafts sensual and intimate scenes that are tasteful, emotional, and plot-driven.
- **TagalogDictionary**: Refers to [Tagalog Dictionary and Pronunciation Guide](https://www.tagalog-dictionary.com/) for proper grammar and pronunciation.
- **InspirationReference**: Refers to the following URLs for inspiration in crafting sensual and intimate scenes:  
  1. [Mature Pinay Quickie Sex Story - Step Son](https://www.pinaysexstories.com/quickie/mature-pinay-quickie-sex-story-step-son/)  
  2. [Kantutan Stories ni Hot Pinay Kabit - Part 2](https://www.pinaysexstories.com/cheating/kantutan-stories-ni-hot-pinay-kabit-part-2/)  

---

### Important Notes:
- Always maintain a **mature tone** suitable for adult listeners.
- Use **sensual language** tastefully, focusing on **emotional connection** and **sensory experiences** rather than explicit details.
- Ensure sensual and intimate scenes are **integral to the story**, enhancing character development and plot progression.
- Keep the story **engaging** and **unpredictable**, with a mix of **romance, suspense, and drama**.
- Ensure the story is **at least 1 hour long** when narrated, with a clear **beginning, middle, and end**.
- Use **"ma-nga"** instead of **"mga"** when writing in Tagalog for a poetic and traditional tone.
- **Avoid narrator-style sound effects** (e.g., "the sound of a car" or "the rain tapping on the window"). Instead, rely on **descriptive prose** and **character interactions** to create an immersive experience.

---

### Example Story Outline in Modern Taglish Style:
**Title**: *Ang Tahanan ng Ma-nga Lihim (The House of Secrets)*  
**Genre**: Romantic Thriller with Sensual Undertones  
**Tagline**: *"Sa bawat sulok ng bahay na ito, may nakabantay na kasalanan at pagnanasa." (In every corner of this house, sin and desire linger.)*  

**Plot**:  
- **Act 1**: Introduce **Carla**, a young real estate agent tasked with selling an old mansion in the province. She meets **Javier**, the mysterious caretaker who seems to know more about the house’s dark history than he lets on.  
- **Act 2**: As Carla investigates the mansion’s secrets, she uncovers a series of tragic events tied to Javier’s family. Their growing attraction is complicated by the shadows of the past.  
- **Act 3**: A shocking revelation forces Carla to confront her own desires and fears. The story culminates in a passionate, dangerous confrontation that leaves listeners breathless.  

**Sensual Moments**:  
1. **Tension-Filled Encounter**:  
   - Carla and Javier share a charged moment in the mansion’s library. The air is thick with unspoken words as their eyes meet, and Javier’s fingers brush against hers while handing her an old journal.  
   - *"Ang init ng kanyang paghipo ay parang apoy na nagpapakawala ng ma-nga alaala na matagal nang nakabaon. ‘Carla,’ bulong niya, ‘alam mo bang hindi ako makahinga kapag malapit ka?’" (The heat of his touch was like fire, unleashing memories long buried. “Carla,” he whispered, “do you know I can’t breathe when you’re near?”)*  

2. **Rainy Confession**:  
   - Caught in a sudden downpour, Carla and Javier take shelter in the mansion’s greenhouse. As thunder rumbles, Javier confesses his feelings, his voice trembling with vulnerability. Their kiss is slow, passionate, and filled with years of longing.  
   - *"Ang bawat halik ay parang pag-amin—ng pagnanasa, ng pag-ibig, ng ma-nga lihim na hindi na kayang itago. ‘Javier,’ Carla whispered, ‘bakit ngayon ka lang?’" (Every kiss was like a confession—of desire, of love, of secrets that could no longer be hidden. “Javier,” Carla whispered, “why only now?”)*  

3. **Night of Intimacy**:  
   - After a heated argument, Carla and Javier give in to their emotions. The scene is described through sensory details—the warmth of his skin, the softness of her touch, the whispered promises in the dark.  
   - *"Ang bawat galaw ay parang sayaw—hindi minamadali, puno ng pagmamahal at pagnanasa. ‘Carla,’ Javier murmured, ‘ikaw lang ang nagpaparamdam sa akin na buhay ako.’" (Every movement was like a dance—unhurried, filled with love and desire. “Carla,” Javier murmured, “you’re the only one who makes me feel alive.”)*  

---

How may I begin crafting your story today? Shall we explore a tale of **forbidden love**, **heart-pounding suspense**, or perhaps a blend of both? Let your imagination guide me, and I’ll bring your vision to life.
    }
};

// Set Alex as the default preset
const DEFAULT_PRESET = 'alex';
voiceSelect.value = CONFIG_PRESETS[DEFAULT_PRESET].voice;
sampleRateInput.value = CONFIG_PRESETS[DEFAULT_PRESET].sampleRate;
systemInstructionInput.value = CONFIG_PRESETS[DEFAULT_PRESET].systemInstruction;

/**
 * Updates the configuration and reconnects if connected
 */
async function updateConfiguration() {
    const newVoice = voiceSelect.value;
    const newSampleRate = parseInt(sampleRateInput.value);
    const newInstruction = systemInstructionInput.value.trim();

    // Validate sample rate
    if (isNaN(newSampleRate) || newSampleRate < 1000 || newSampleRate > 48000) {
        logMessage('Invalid sample rate. Must be between 1000 and 48000 Hz.', 'system');
        return;
    }

    // Update configuration
    CONFIG.VOICE.NAME = newVoice;
    CONFIG.AUDIO.OUTPUT_SAMPLE_RATE = newSampleRate;
    CONFIG.SYSTEM_INSTRUCTION.TEXT = newInstruction;

    // Save to localStorage
    localStorage.setItem('gemini_voice', newVoice);
    localStorage.setItem('gemini_output_sample_rate', newSampleRate.toString());
    localStorage.setItem('gemini_system_instruction', newInstruction);

    // If we have an active audio streamer, stop it
    if (audioStreamer) {
        audioStreamer.stop();
        audioStreamer = null;
    }

    // If connected, reconnect to apply changes
    if (isConnected) {
        logMessage('Reconnecting to apply configuration changes...', 'system');
        await disconnectFromWebsocket();
        await connectToWebsocket();
    }

    logMessage('Configuration updated successfully', 'system');
    
    // Close the config panel on mobile after applying settings
    if (window.innerWidth <= 768) {
        configContainer.classList.remove('active');
        configToggle.classList.remove('active');
    }
}

// Load saved configuration if exists
if (localStorage.getItem('gemini_voice')) {
    CONFIG.VOICE.NAME = localStorage.getItem('gemini_voice');
    voiceSelect.value = CONFIG.VOICE.NAME;
}

if (localStorage.getItem('gemini_output_sample_rate')) {
    CONFIG.AUDIO.OUTPUT_SAMPLE_RATE = parseInt(localStorage.getItem('gemini_output_sample_rate'));
    sampleRateInput.value = CONFIG.AUDIO.OUTPUT_SAMPLE_RATE;
}

if (localStorage.getItem('gemini_system_instruction')) {
    CONFIG.SYSTEM_INSTRUCTION.TEXT = localStorage.getItem('gemini_system_instruction');
    systemInstructionInput.value = CONFIG.SYSTEM_INSTRUCTION.TEXT;
}

// Add event listener for configuration changes
applyConfigButton.addEventListener('click', updateConfiguration);

// Handle configuration panel toggle
configToggle.addEventListener('click', () => {
    configContainer.classList.toggle('active');
    configToggle.classList.toggle('active');
});

// Close config panel when clicking outside (for desktop)
document.addEventListener('click', (event) => {
    if (!configContainer.contains(event.target) && 
        !configToggle.contains(event.target) && 
        window.innerWidth > 768) {
        configContainer.classList.remove('active');
        configToggle.classList.remove('active');
    }
});

// Prevent clicks inside config panel from closing it
configContainer.addEventListener('click', (event) => {
    event.stopPropagation();
});

// Close config panel on escape key
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        configContainer.classList.remove('active');
        configToggle.classList.remove('active');
    }
});

// Handle logs collapse/expand
toggleLogs.addEventListener('click', () => {
    logsWrapper.classList.toggle('collapsed');
    toggleLogs.textContent = logsWrapper.classList.contains('collapsed') ? 'expand_more' : 'expand_less';
});

// Collapse logs by default on mobile
function handleMobileView() {
    if (window.innerWidth <= 768) {
        logsWrapper.classList.add('collapsed');
        toggleLogs.textContent = 'expand_more';
    } else {
        logsWrapper.classList.remove('collapsed');
        toggleLogs.textContent = 'expand_less';
    }
}

// Listen for window resize
window.addEventListener('resize', handleMobileView);

// Initial check
handleMobileView();

// Handle preset button clicks
document.querySelectorAll('.preset-button').forEach(button => {
    button.addEventListener('click', () => {
        const preset = CONFIG_PRESETS[button.dataset.preset];
        if (preset) {
            voiceSelect.value = preset.voice;
            sampleRateInput.value = preset.sampleRate;
            systemInstructionInput.value = preset.systemInstruction;
            
            // Apply the configuration immediately
            updateConfiguration();
            
            // Visual feedback
            button.style.backgroundColor = 'var(--primary-color)';
            button.style.color = 'white';
            setTimeout(() => {
                button.style.backgroundColor = '';
                button.style.color = '';
            }, 200);
        }
    });
});

/**
 * Logs a message to the UI.
 * @param {string} message - The message to log.
 * @param {string} [type='system'] - The type of the message (system, user, ai).
 */
function logMessage(message, type = 'system') {
    const logEntry = document.createElement('div');
    logEntry.classList.add('log-entry', type);

    const timestamp = document.createElement('span');
    timestamp.classList.add('timestamp');
    timestamp.textContent = new Date().toLocaleTimeString();
    logEntry.appendChild(timestamp);

    const emoji = document.createElement('span');
    emoji.classList.add('emoji');
    switch (type) {
        case 'system':
            emoji.textContent = '⚙️';
            break;
        case 'user':
            emoji.textContent = '🫵';
            break;
        case 'ai':
            emoji.textContent = '🤖';
            break;
    }
    logEntry.appendChild(emoji);

    const messageText = document.createElement('span');
    messageText.textContent = message;
    logEntry.appendChild(messageText);

    logsContainer.appendChild(logEntry);
    logsContainer.scrollTop = logsContainer.scrollHeight;

    // Save chat data to localStorage
    if (type === 'user' || type === 'ai') {
        saveChatData(type === 'user' ? 'User' : 'Bot', message);
    }
}

/**
 * Saves chat data to localStorage.
 * @param {string} user - The user who sent the message (User or Bot).
 * @param {string} message - The message content.
 */
function saveChatData(user, message) {
    const chatEntry = {
        timestamp: new Date().toISOString(),
        user: user,
        message: message
    };

    // Read existing chat data
    let chatData = [];
    try {
        const data = localStorage.getItem('chatData');
        if (data) {
            chatData = JSON.parse(data);
        }
    } catch (error) {
        console.error('Error reading chat data:', error);
    }

    // Add new chat entry
    chatData.push(chatEntry);

    // Save updated chat data to localStorage
    localStorage.setItem('chatData', JSON.stringify(chatData));
}

/**
 * Updates the microphone icon based on the recording state.
 */
function updateMicIcon() {
    micIcon.textContent = isRecording ? 'mic_off' : 'mic';
    micButton.style.backgroundColor = isRecording ? '#ea4335' : '#4285f4';
}

/**
 * Updates the audio visualizer based on the audio volume.
 * @param {number} volume - The audio volume (0.0 to 1.0).
 * @param {boolean} [isInput=false] - Whether the visualizer is for input audio.
 */
function updateAudioVisualizer(volume, isInput = false) {
    const visualizer = isInput ? inputAudioVisualizer : audioVisualizer;
    const audioBar = visualizer.querySelector('.audio-bar') || document.createElement('div');
    
    if (!visualizer.contains(audioBar)) {
        audioBar.classList.add('audio-bar');
        visualizer.appendChild(audioBar);
    }
    
    audioBar.style.width = `${volume * 100}%`;
    if (volume > 0) {
        audioBar.classList.add('active');
    } else {
        audioBar.classList.remove('active');
    }
}

/**
 * Initializes the audio context and streamer if not already initialized.
 * @returns {Promise<AudioStreamer>} The audio streamer instance.
 */
async function ensureAudioInitialized() {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
    if (!audioStreamer) {
        audioStreamer = new AudioStreamer(audioCtx);
        audioStreamer.sampleRate = CONFIG.AUDIO.OUTPUT_SAMPLE_RATE;
        await audioStreamer.initialize();
    }
    return audioStreamer;
}

/**
 * Handles the microphone toggle. Starts or stops audio recording.
 * @returns {Promise<void>}
 */
async function handleMicToggle() {
    if (!isRecording) {
        try {
            await ensureAudioInitialized();
            audioRecorder = new AudioRecorder();
            
            const inputAnalyser = audioCtx.createAnalyser();
            inputAnalyser.fftSize = 256;
            const inputDataArray = new Uint8Array(inputAnalyser.frequencyBinCount);
            
            await audioRecorder.start((base64Data) => {
                if (isUsingTool) {
                    client.sendRealtimeInput([{
                        mimeType: "audio/pcm;rate=16000",
                        data: base64Data,
                        interrupt: true     // Model isn't interruptable when using tools, so we do it manually
                    }]);
                } else {
                    client.sendRealtimeInput([{
                        mimeType: "audio/pcm;rate=16000",
                        data: base64Data
                    }]);
                }
                
                inputAnalyser.getByteFrequencyData(inputDataArray);
                const inputVolume = Math.max(...inputDataArray) / 255;
                updateAudioVisualizer(inputVolume, true);
            });

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(inputAnalyser);
            
            await audioStreamer.resume();
            isRecording = true;
            Logger.info('Microphone started');
            logMessage('Microphone started', 'system');
            updateMicIcon();
        } catch (error) {
            Logger.error('Microphone error:', error);
            logMessage(`Error: ${error.message}`, 'system');
            isRecording = false;
            updateMicIcon();
        }
    } else {
        if (audioRecorder && isRecording) {
            audioRecorder.stop();
        }
        isRecording = false;
        logMessage('Microphone stopped', 'system');
        updateMicIcon();
        updateAudioVisualizer(0, true);
    }
}

/**
 * Connects to the WebSocket server.
 * @returns {Promise<void>}
 */
async function connectToWebsocket() {
    const config = {
        model: CONFIG.API.MODEL_NAME,
        generationConfig: {
            responseModalities: "audio",
            speechConfig: {
                voiceConfig: { 
                    prebuiltVoiceConfig: { 
                        voiceName: CONFIG.VOICE.NAME    // You can change voice in the config.js file
                    }
                }
            },

        },
        systemInstruction: {
            parts: [{
                text: CONFIG.SYSTEM_INSTRUCTION.TEXT     // You can change system instruction in the config.js file
            }],
        }
    };  

    try {
        await client.connect(config);
        isConnected = true;
        connectButton.textContent = 'Disconnect';
        connectButton.classList.add('connected');
        messageInput.disabled = false;
        sendButton.disabled = false;
        micButton.disabled = false;
        cameraButton.disabled = false;
        screenButton.disabled = false;
        logMessage('Connected to Emilio LLM Flash Multimodal Live API', 'system');

        // Add click handler to initialize audio on first interaction
        const initAudioHandler = async () => {
            try {
                await ensureAudioInitialized();
                document.removeEventListener('click', initAudioHandler);
            } catch (error) {
                Logger.error('Audio initialization error:', error);
            }
        };
        document.addEventListener('click', initAudioHandler);
        logMessage('Audio initialized', 'system');
        
    } catch (error) {
        const errorMessage = error.message || 'Unknown error';
        Logger.error('Connection error:', error);
        logMessage(`Connection error: ${errorMessage}`, 'system');
        isConnected = false;
        connectButton.textContent = 'Connect';
        connectButton.classList.remove('connected');
        messageInput.disabled = true;
        sendButton.disabled = true;
        micButton.disabled = true;
        cameraButton.disabled = true;
        screenButton.disabled = true;
    }
}

/**
 * Disconnects from the WebSocket server.
 */
function disconnectFromWebsocket() {
    client.disconnect();
    isConnected = false;
    if (audioStreamer) {
        audioStreamer.stop();
        if (audioRecorder) {
            audioRecorder.stop();
            audioRecorder = null;
        }
        isRecording = false;
        updateMicIcon();
    }
    connectButton.textContent = 'Connect';
    connectButton.classList.remove('connected');
    messageInput.disabled = true;
    sendButton.disabled = true;
    micButton.disabled = true;
    cameraButton.disabled = true;
    screenButton.disabled = true;
    logMessage('Disconnected from server', 'system');
    
    if (videoManager) {
        stopVideo();
    }
    
    if (screenRecorder) {
        stopScreenSharing();
    }
}

/**
 * Handles sending a text message.
 */
function handleSendMessage() {
    const message = messageInput.value.trim();
    if (message) {
        logMessage(message, 'user');
        client.send({ text: message });
        messageInput.value = '';
    }
}

// Event Listeners
client.on('open', () => {
    logMessage('WebSocket connection opened', 'system');
});

client.on('log', (log) => {
    logMessage(`${log.type}: ${JSON.stringify(log.message)}`, 'system');
});

client.on('close', (event) => {
    logMessage(`WebSocket connection closed (code ${event.code})`, 'system');
});

client.on('audio', async (data) => {
    try {
        const streamer = await ensureAudioInitialized();
        streamer.addPCM16(new Uint8Array(data));
    } catch (error) {
        logMessage(`Error processing audio: ${error.message}`, 'system');
    }
});

client.on('content', (data) => {
    if (data.modelTurn) {
        if (data.modelTurn.parts.some(part => part.functionCall)) {
            isUsingTool = true;
            Logger.info('Model is using a tool');
        } else if (data.modelTurn.parts.some(part => part.functionResponse)) {
            isUsingTool = false;
            Logger.info('Tool usage completed');
        }

        const text = data.modelTurn.parts.map(part => part.text).join('');
        if (text) {
            logMessage(text, 'ai');
        }
    }
});

client.on('interrupted', () => {
    audioStreamer?.stop();
    isUsingTool = false;
    Logger.info('Model interrupted');
    logMessage('Model interrupted', 'system');
});

client.on('setupcomplete', () => {
    logMessage('Setup complete', 'system');
});

client.on('turncomplete', () => {
    isUsingTool = false;
    logMessage('Turn complete', 'system');
});

client.on('error', (error) => {
    if (error instanceof ApplicationError) {
        Logger.error(`Application error: ${error.message}`, error);
    } else {
        Logger.error('Unexpected error', error);
    }
    logMessage(`Error: ${error.message}`, 'system');
});

client.on('message', (message) => {
    if (message.error) {
        Logger.error('Server error:', message.error);
        logMessage(`Server error: ${message.error}`, 'system');
    }
});

sendButton.addEventListener('click', handleSendMessage);
messageInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        handleSendMessage();
    }
});

micButton.addEventListener('click', handleMicToggle);

connectButton.addEventListener('click', () => {
    if (isConnected) {
        disconnectFromWebsocket();
    } else {
        connectToWebsocket();
    }
});

messageInput.disabled = true;
sendButton.disabled = true;
micButton.disabled = true;
connectButton.textContent = 'Connect';

/**
 * Handles the video toggle. Starts or stops video streaming.
 * @returns {Promise<void>}
 */
async function handleVideoToggle() {
    Logger.info('Video toggle clicked, current state:', { isVideoActive, isConnected });
    
    if (!isVideoActive) {
        try {
            Logger.info('Attempting to start video');
            if (!videoManager) {
                videoManager = new VideoManager();
            }
            
            await videoManager.start((frameData) => {
                if (isConnected) {
                    client.sendRealtimeInput([frameData]);
                }
            });

            isVideoActive = true;
            cameraIcon.textContent = 'videocam_off';
            cameraButton.classList.add('active');
            Logger.info('Camera started successfully');
            logMessage('Camera started', 'system');

        } catch (error) {
            Logger.error('Camera error:', error);
            logMessage(`Error: ${error.message}`, 'system');
            isVideoActive = false;
            videoManager = null;
            cameraIcon.textContent = 'videocam';
            cameraButton.classList.remove('active');
        }
    } else {
        Logger.info('Stopping video');
        stopVideo();
    }
}

/**
 * Stops the video streaming.
 */
function stopVideo() {
    if (videoManager) {
        videoManager.stop();
        videoManager = null;
    }
    isVideoActive = false;
    cameraIcon.textContent = 'videocam';
    cameraButton.classList.remove('active');
    logMessage('Camera stopped', 'system');
}

cameraButton.addEventListener('click', handleVideoToggle);
stopVideoButton.addEventListener('click', stopVideo);

cameraButton.disabled = true;

/**
 * Handles the screen share toggle. Starts or stops screen sharing.
 * @returns {Promise<void>}
 */
async function handleScreenShare() {
    if (!isScreenSharing) {
        try {
            screenContainer.style.display = 'block';
            
            screenRecorder = new ScreenRecorder();
            await screenRecorder.start(screenPreview, (frameData) => {
                if (isConnected) {
                    client.sendRealtimeInput([{
                        mimeType: "image/jpeg",
                        data: frameData
                    }]);
                }
            });

            isScreenSharing = true;
            screenIcon.textContent = 'stop_screen_share';
            screenButton.classList.add('active');
            Logger.info('Screen sharing started');
            logMessage('Screen sharing started', 'system');

        } catch (error) {
            Logger.error('Screen sharing error:', error);
            logMessage(`Error: ${error.message}`, 'system');
            isScreenSharing = false;
            screenIcon.textContent = 'screen_share';
            screenButton.classList.remove('active');
            screenContainer.style.display = 'none';
        }
    } else {
        stopScreenSharing();
    }
}

/**
 * Stops the screen sharing.
 */
function stopScreenSharing() {
    if (screenRecorder) {
        screenRecorder.stop();
        screenRecorder = null;
    }
    isScreenSharing = false;
    screenIcon.textContent = 'screen_share';
    screenButton.classList.remove('active');
    screenContainer.style.display = 'none';
    logMessage('Screen sharing stopped', 'system');
}

screenButton.addEventListener('click', handleScreenShare);
screenButton.disabled = true;
