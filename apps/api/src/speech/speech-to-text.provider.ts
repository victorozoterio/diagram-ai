export const SPEECH_TO_TEXT_PROVIDER = Symbol('SPEECH_TO_TEXT_PROVIDER');

export type SpeechToTextAudio = {
  buffer: Buffer;
  mimeType: string;
};

export type SpeechToTextResult = {
  text: string;
  language: string;
};

export interface SpeechToTextProvider {
  transcribe(audio: SpeechToTextAudio): Promise<SpeechToTextResult>;
}

export class SpeechToTextProviderError extends Error {
  constructor(
    readonly code: 'not_configured' | 'transcription_failed' | 'empty_transcription',
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'SpeechToTextProviderError';
  }
}
