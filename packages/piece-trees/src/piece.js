import Tone from 'tone';
import { Scale, Note } from 'tonal';
import fetchSpecFile from '@generative-music/samples.generative.fm/browser-client';

const tonic = Note.names()[Math.floor(Math.random() * Note.names().length)];
const scalePitchClasses = Scale.notes(tonic, 'major');
const notes = [3, 4, 5, 6].reduce(
  (allNotes, octave) =>
    allNotes.concat(scalePitchClasses.map(pc => `${pc}${octave}`)),
  []
);

const getOffsetProgression = () => {
  const progression = [];
  const startingStep = Math.random() < 0.5 ? 0 : 1;
  const largestStep = Math.random() * (5 - startingStep) + startingStep;
  for (
    let step = startingStep;
    step <= largestStep;
    step += Math.random() < 0.5 ? 1 : 2
  ) {
    const chord = [];
    for (let i = step; i >= 0; i -= 2) {
      if (i === 0) {
        chord.push(i);
      } else {
        chord.push(i, -i);
      }
    }
    progression.push(chord);
  }
  return progression;
};

const makeOffsetProgressionToIndiciesProgression = startingIndex => offsetProgression =>
  offsetProgression.map(chord =>
    chord
      .map(offset => startingIndex + offset)
      .filter(index => index >= 0 && index < notes.length)
  );

const indiciesProgressionToNoteProgression = indiciesProgression =>
  indiciesProgression.map(chord => chord.map(index => notes[index]));

const pipe = (...fns) => x => fns.reduce((y, fn) => fn(y), x);

const getProgression = () =>
  pipe(
    getOffsetProgression,
    makeOffsetProgressionToIndiciesProgression(
      Math.floor(Math.random() * notes.length)
    ),
    indiciesProgressionToNoteProgression
  )();

const playProgression = piano => {
  const progression = getProgression();
  const perChordDelay = Math.random() * 3 + 2;
  progression.forEach((chord, i) => {
    chord.forEach(note =>
      piano.triggerAttack(note, `+${i * perChordDelay + Math.random() / 10}`)
    );
  });
  Tone.Transport.scheduleOnce(() => {
    playProgression(piano);
  }, `+${Math.random() * 3 + (progression.length + 1) * perChordDelay}`);
};

const getSampledInstrument = samplesByNote =>
  new Promise(resolve => {
    const instrument = new Tone.Sampler(samplesByNote, {
      onload: () => resolve(instrument),
    });
  });

const makePiece = ({
  audioContext,
  destination,
  preferredFormat,
  sampleSource = {},
}) =>
  fetchSpecFile(sampleSource.baseUrl, sampleSource.specFilename)
    .then(({ samples }) => {
      if (Tone.context !== audioContext) {
        Tone.setContext(audioContext);
      }
      return getSampledInstrument(samples['vsco2-piano-mf'][preferredFormat]);
    })
    .then(piano => {
      const reverb = new Tone.Freeverb({ roomSize: 0.6 });
      piano.chain(reverb, destination);
      playProgression(piano);
      return () => {
        [reverb, piano].forEach(node => node.dispose());
      };
    });

export default makePiece;
