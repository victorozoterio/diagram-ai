import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ENV, type EnvironmentVariables } from '../config/environments';
import {
  type SpeechToTextAudio,
  type SpeechToTextProvider,
  SpeechToTextProviderError,
  type SpeechToTextResult,
} from './speech-to-text.provider';

const execFileAsync = promisify(execFile);

const extensionByMimeType: Record<string, string> = {
  'audio/mp4': '.m4a',
  'audio/mpeg': '.mp3',
  'audio/ogg': '.ogg',
  'audio/wav': '.wav',
  'audio/webm': '.webm',
};

@Injectable()
export class WhisperSpeechToTextProvider implements SpeechToTextProvider {
  constructor(private readonly configService: ConfigService<EnvironmentVariables, true>) {}

  async transcribe(audio: SpeechToTextAudio): Promise<SpeechToTextResult> {
    const whisperBinaryPath = this.configService.get(ENV.WHISPER_CPP_BINARY_PATH, { infer: true });
    const whisperModelPath = this.configService.get(ENV.WHISPER_CPP_MODEL_PATH, { infer: true });

    if (!whisperBinaryPath || !whisperModelPath) {
      throw new SpeechToTextProviderError(
        'not_configured',
        'A transcrição por voz não está configurada neste ambiente.',
      );
    }

    const language = this.configService.get(ENV.WHISPER_CPP_LANGUAGE, { infer: true });
    const ffmpegBinaryPath = this.configService.get(ENV.FFMPEG_BINARY_PATH, { infer: true });
    const timeout = this.configService.get(ENV.SPEECH_TO_TEXT_TIMEOUT_MS, { infer: true });
    const workDirectory = await mkdtemp(join(tmpdir(), 'diagram-ai-speech-'));
    const extension = extensionByMimeType[audio.mimeType.split(';', 1)[0]] ?? '.webm';
    const inputPath = join(workDirectory, `recording${extension}`);
    const wavPath = join(workDirectory, 'recording.wav');
    const outputPath = join(workDirectory, 'transcription');

    try {
      await writeFile(inputPath, audio.buffer);
      await execFileAsync(ffmpegBinaryPath, ['-y', '-i', inputPath, '-ar', '16000', '-ac', '1', wavPath], {
        timeout,
        maxBuffer: 1024 * 1024,
      });
      await execFileAsync(
        whisperBinaryPath,
        ['-m', whisperModelPath, '-f', wavPath, '-l', language, '-otxt', '-of', outputPath, '-np'],
        { timeout, maxBuffer: 1024 * 1024 },
      );

      const text = (await readFile(`${outputPath}.txt`, 'utf8')).trim();
      if (!text) {
        throw new SpeechToTextProviderError('empty_transcription', 'Nenhuma fala foi identificada no áudio.');
      }

      return { text, language };
    } catch (error) {
      if (error instanceof SpeechToTextProviderError) throw error;

      throw new SpeechToTextProviderError(
        'transcription_failed',
        'Não foi possível transcrever o áudio com whisper.cpp.',
        { cause: error },
      );
    } finally {
      await rm(workDirectory, { recursive: true, force: true });
    }
  }
}
