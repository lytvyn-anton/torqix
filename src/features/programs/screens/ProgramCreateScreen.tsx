import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ProgramForm } from '../components/ProgramForm';
import { useCreateProgram } from '../hooks/useCreateProgram';
import { useCreateJournal } from '../../journal/hooks/useCreateJournal';

type Props = {
  userId: string;
  // Set when this screen was reached from the Home tab's "start a journal" flow
  // (NewJournalSheet, via program-create.tsx's `intent` search param) rather than the
  // Programs tab's own "New" button — on save, a journal is created for the new program and
  // the user goes straight into logging its first entry instead of back to the Programs list.
  intent?: 'journal';
};

export function ProgramCreateScreen({ userId, intent }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const createProgram = useCreateProgram(userId);
  const createJournal = useCreateJournal(userId);

  return (
    <ProgramForm
      onSave={(input) =>
        createProgram.mutate(input, {
          onSuccess: (program) => {
            if (intent === 'journal') {
              // The program is already saved at this point regardless of what happens next —
              // always navigate to it rather than leaving the form re-enabled on a journal
              // creation failure (which would risk a duplicate program from a retried Save)
              // or silently going back with no sign the program actually saved. The Home
              // tab's JournalWidgetCard can always start this program's journal later (it
              // resolves-or-creates on first day tap).
              createJournal.mutate(
                { programId: program.id, name: program.name },
                {
                  onSuccess: (journal) => router.replace(`/journal-entry/${journal.id}`),
                  onError: () => router.replace(`/program/${program.id}`),
                },
              );
            } else {
              router.back();
            }
          },
        })
      }
      isSaving={createProgram.isPending || createJournal.isPending}
      // Deliberately not OR'd with createJournal.isError: when only the journal step fails
      // the program itself saved fine and the screen navigates to it above, so there's
      // nothing left on this form to blame — showing "couldn't create the program" here
      // would misattribute a journal failure to program creation, which didn't happen.
      isError={createProgram.isError}
      errorText={t('programs.createError')}
      saveLabel={t('programs.create')}
    />
  );
}
