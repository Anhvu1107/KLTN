/**
 * PCM Audio Processor (AudioWorklet)
 * AURA ARCHIVE - Captures microphone audio as PCM 16-bit, 16kHz
 * Runs on a separate audio thread for smooth performance
 */
class PCMProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this._buffer = [];
        this._bufferSize = 2400; // ~150ms at 16kHz
    }

    process(inputs) {
        const input = inputs[0];
        if (!input || !input[0]) return true;

        const channelData = input[0];

        // Downsample from 48kHz (browser default) to 16kHz
        // Take every 3rd sample (48000/16000 = 3)
        for (let i = 0; i < channelData.length; i += 3) {
            // Convert float32 [-1, 1] to int16 [-32768, 32767]
            const s = Math.max(-1, Math.min(1, channelData[i]));
            this._buffer.push(s < 0 ? s * 0x8000 : s * 0x7FFF);
        }

        // Send buffer when full
        if (this._buffer.length >= this._bufferSize) {
            const pcm16 = new Int16Array(this._buffer.splice(0, this._bufferSize));
            this.port.postMessage({
                type: 'audio',
                data: pcm16.buffer,
            }, [pcm16.buffer]);
        }

        return true;
    }
}

registerProcessor('pcm-processor', PCMProcessor);
