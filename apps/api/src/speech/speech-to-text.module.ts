import { Module } from '@nestjs/common';
import { SPEECH_TO_TEXT_PROVIDER } from './speech-to-text.provider';
import { SpeechToTextService } from './speech-to-text.service';
import { WhisperSpeechToTextProvider } from './whisper-speech-to-text.provider';

@Module({
  providers: [
    WhisperSpeechToTextProvider,
    {
      provide: SPEECH_TO_TEXT_PROVIDER,
      useExisting: WhisperSpeechToTextProvider,
    },
    SpeechToTextService,
  ],
  exports: [SpeechToTextService],
})
export class SpeechToTextModule {}
