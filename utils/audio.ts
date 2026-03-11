export class AudioStreamer {
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private isRecording = false;

  async start(onAudioData: (base64Data: string) => void) {
    if (this.isRecording) return;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
        },
      });

      this.audioContext = new AudioContext({ sampleRate: 16000 });
      await this.audioContext.audioWorklet.addModule(
        URL.createObjectURL(
          new Blob(
            [
              `
              class PCMProcessor extends AudioWorkletProcessor {
                process(inputs, outputs, parameters) {
                  const input = inputs[0];
                  if (input.length > 0) {
                    const channelData = input[0];
                    const pcm16 = new Int16Array(channelData.length);
                    for (let i = 0; i < channelData.length; i++) {
                      let s = Math.max(-1, Math.min(1, channelData[i]));
                      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                    }
                    this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
                  }
                  return true;
                }
              }
              registerProcessor('pcm-processor', PCMProcessor);
            `,
            ],
            { type: 'application/javascript' }
          )
        )
      );

      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.workletNode = new AudioWorkletNode(this.audioContext, 'pcm-processor');

      this.workletNode.port.onmessage = (event) => {
        const buffer = event.data as ArrayBuffer;
        const base64 = this.arrayBufferToBase64(buffer);
        onAudioData(base64);
      };

      this.source.connect(this.workletNode);
      this.workletNode.connect(this.audioContext.destination);
      this.isRecording = true;
    } catch (err) {
      console.error('Error starting audio recording:', err);
    }
  }

  stop() {
    if (!this.isRecording) return;
    this.isRecording = false;
    this.workletNode?.disconnect();
    this.source?.disconnect();
    this.stream?.getTracks().forEach((track) => track.stop());
    this.audioContext?.close();
    this.audioContext = null;
    this.workletNode = null;
    this.source = null;
    this.stream = null;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

export class AudioPlayer {
  private audioContext: AudioContext;
  private nextTime: number = 0;

  constructor() {
    this.audioContext = new AudioContext({ sampleRate: 24000 });
  }

  async play(base64Data: string) {
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // The Live API returns PCM16 24kHz audio.
    const pcm16 = new Int16Array(bytes.buffer);
    const audioBuffer = this.audioContext.createBuffer(1, pcm16.length, 24000);
    const channelData = audioBuffer.getChannelData(0);

    for (let i = 0; i < pcm16.length; i++) {
      channelData[i] = pcm16[i] / 0x8000;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    const currentTime = this.audioContext.currentTime;
    if (this.nextTime < currentTime) {
      this.nextTime = currentTime;
    }

    source.start(this.nextTime);
    this.nextTime += audioBuffer.duration;
  }

  stop() {
    this.audioContext.close();
    this.audioContext = new AudioContext({ sampleRate: 24000 });
    this.nextTime = 0;
  }
}
