const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export function RedactedKeyboard({ guessedLetters, correctLetters, disabled, onGuess }: {
  guessedLetters: string[]
  correctLetters: string[]
  disabled: boolean
  onGuess: (letter: string) => void
}) {
  return (
    <div className="redacted-keyboard" aria-label="Letter keyboard">
      {LETTERS.map(letter => (
        <button
          type="button"
          key={letter}
          className={guessedLetters.includes(letter) ? correctLetters.includes(letter) ? 'correct' : 'wrong' : ''}
          disabled={disabled || guessedLetters.includes(letter)}
          aria-pressed={guessedLetters.includes(letter)}
          aria-label={`Guess ${letter}`}
          onClick={() => onGuess(letter)}
        >{letter}</button>
      ))}
    </div>
  )
}
