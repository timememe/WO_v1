// DAYVIBE - Audio Bridge
// =======================
// Manages communication with Strudel IFrame instances

// Store early messages that arrive before bridges are created
const earlyMessages = [];

// Setup global message listener IMMEDIATELY (at module load time)
// This catches messages even before bridges are created
window.addEventListener('message', (event) => {
    earlyMessages.push({
        timestamp: Date.now(),
        data: event.data
    });
});

class StrudelBridge {
    constructor(frameId, name) {
        this.frameId = frameId;
        this.name = name;
        this.frame = null;
        this.ready = false;
        this.messageId = 0;
        this.pendingMessages = new Map();
        this.initResolver = null;
        this.initRejector = null;

        console.log(`[${this.name}Bridge] Initializing...`);

        // Check early messages for ready message that might have arrived before constructor
        const readyMessageType = `${this.name.toLowerCase()}-ready`;
        const earlyReadyMessage = earlyMessages.find(msg => msg.data.type === readyMessageType);

        if (earlyReadyMessage) {
            console.log(`[${this.name}Bridge] Found early ready message from ${earlyReadyMessage.timestamp}`);
            this.ready = true;
        }

        // Setup message listeners IMMEDIATELY in constructor
        // to catch ready messages that might come before init() is called
        window.addEventListener('message', (event) => {
            const { type, id, success, error } = event.data;

            // Handle ready message
            if (type === readyMessageType) {
                console.log(`[${this.name}Bridge] ✅ Frame ready!`);
                this.ready = true;
                if (this.initResolver) {
                    this.initResolver();
                    this.initResolver = null;
                    this.initRejector = null;
                }
            }
            // Handle response messages
            else if (type === `${this.name.toLowerCase()}-response` && this.pendingMessages.has(id)) {
                const { resolve, reject } = this.pendingMessages.get(id);
                this.pendingMessages.delete(id);

                if (success) {
                    resolve(event.data);
                } else {
                    reject(new Error(error || 'Unknown error'));
                }
            }
        });
    }

    init() {
        return new Promise((resolve, reject) => {
            this.frame = document.getElementById(this.frameId);

            if (!this.frame) {
                console.error(`[${this.name}Bridge] Frame element not found: ${this.frameId}`);
                reject(new Error(`Frame ${this.frameId} not found`));
                return;
            }

            console.log(`[${this.name}Bridge] Frame element found, waiting for ready message...`);
            console.log(`[${this.name}Bridge] Looking for message type: ${this.name.toLowerCase()}-ready`);

            // Check if already ready (message came before init was called)
            if (this.ready) {
                console.log(`[${this.name}Bridge] Already ready!`);
                resolve();
                return;
            }

            // Store resolvers for when ready message arrives
            this.initResolver = resolve;
            this.initRejector = reject;

            // Timeout after 30 seconds (Strudel loading can be slow)
            setTimeout(() => {
                if (!this.ready && this.initRejector) {
                    console.error(`[${this.name}Bridge] Init timeout - frame did not send ready message`);
                    this.initRejector(new Error(`${this.name} frame init timeout`));
                    this.initResolver = null;
                    this.initRejector = null;
                }
            }, 30000);
        });
    }

    async sendMessage(action, data = {}) {
        if (!this.ready) {
            throw new Error(`${this.name} frame not ready`);
        }

        const id = ++this.messageId;

        return new Promise((resolve, reject) => {
            this.pendingMessages.set(id, { resolve, reject });

            this.frame.contentWindow.postMessage({
                action,
                id,
                ...data
            }, '*');

            // Timeout individual messages after 5 seconds
            setTimeout(() => {
                if (this.pendingMessages.has(id)) {
                    this.pendingMessages.delete(id);
                    reject(new Error(`${this.name} message timeout`));
                }
            }, 5000);
        });
    }

    async evaluate(code) {
        console.log(`[${this.name}Bridge] Evaluating:`, code);
        return await this.sendMessage('evaluate', { code });
    }

    async stop() {
        console.log(`[${this.name}Bridge] Stopping`);
        return await this.sendMessage('stop');
    }

    async setAudioOutput(deviceId) {
        console.log(`[${this.name}Bridge] Setting audio output to:`, deviceId);
        return await this.sendMessage('setOutput', { deviceId });
    }

    async getAudioOutputs() {
        console.log(`[${this.name}Bridge] Getting available audio outputs`);
        return await this.sendMessage('getOutputs');
    }
}

// Singleton instances (created lazily)
let sequencerBridge = null;
let loopsBridge = null;

// Get or create sequencer bridge
export function getSequencerBridge() {
    if (!sequencerBridge) {
        sequencerBridge = new StrudelBridge('sequencerFrame', 'Sequencer');
    }
    return sequencerBridge;
}

// Get or create loops bridge
export function getLoopsBridge() {
    if (!loopsBridge) {
        loopsBridge = new StrudelBridge('loopsFrame', 'Loops');
    }
    return loopsBridge;
}

// Export bridges for convenience (will be null until first access)
export { sequencerBridge, loopsBridge };

// Initialize both bridges
export async function initAudioBridges() {
    console.log('🎵 Initializing audio bridges...');

    try {
        // Create bridges NOW (when DOM is ready)
        const seqBridge = getSequencerBridge();
        const loopBridge = getLoopsBridge();

        // Update exports
        sequencerBridge = seqBridge;
        loopsBridge = loopBridge;

        await Promise.all([
            seqBridge.init(),
            loopBridge.init()
        ]);

        console.log('✅ Both audio bridges ready');
        return true;
    } catch (error) {
        console.error('❌ Audio bridge init failed:', error);
        throw error;
    }
}
