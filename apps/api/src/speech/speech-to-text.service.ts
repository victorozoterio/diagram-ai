import {
  BadGatewayException,
  BadRequestException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  SPEECH_TO_TEXT_PROVIDER,
  type SpeechToTextProvider,
  SpeechToTextProviderError,
  type SpeechToTextResult,
} from './speech-to-text.provider';

const MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024;

export type UploadedAudio = {
  buffer: Buffer;
  mimetype: string;
  size: number;
};

@Injectable()
export class SpeechToTextService {
  constructor(@Inject(SPEECH_TO_TEXT_PROVIDER) private readonly provider: SpeechToTextProvider) {}

  async transcribe(audio?: UploadedAudio): Promise<SpeechToTextResult> {
    if (!audio?.buffer?.length) {
      throw new BadRequestException('Envie um arquivo de áudio para transcrição.');
    }

    if (!audio.mimetype.startsWith('audio/')) {
      throw new BadRequestException('O arquivo enviado deve ser um áudio válido.');
    }

    if (audio.size > MAX_AUDIO_SIZE_BYTES) {
      throw new BadRequestException('O áudio excede o limite de 25 MB.');
    }

    try {
      return await this.provider.transcribe({ buffer: audio.buffer, mimeType: audio.mimetype });
    } catch (error) {
      if (error instanceof SpeechToTextProviderError) {
        if (error.code === 'not_configured') {
          throw new ServiceUnavailableException(error.message);
        }
        if (error.code === 'empty_transcription') {
          throw new BadRequestException(error.message);
        }
      }

      console.error('[SPEECH] falha na transcrição', error);
      throw new BadGatewayException('Não foi possível transcrever o áudio. Tente novamente.');
    }
  }
}
