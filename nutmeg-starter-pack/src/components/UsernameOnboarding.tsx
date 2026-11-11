import { Fingerprint, LoaderCircle, Shuffle, UserRoundCheck } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
import { createIdentity, getUsernameSuggestions, RankedApiError, saveRankedIdentity, type RankedIdentity } from '../api/ranked'

export function UsernameOnboarding({ onComplete }: { onComplete: (identity: RankedIdentity) => void }) {
  const [username, setUsername] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const refreshSuggestions = () => {
    getUsernameSuggestions().then(result => setSuggestions(result.suggestions)).catch(() => setSuggestions(['GoalSleuth27', 'PitchAgent10', 'FinalWhistle7']))
  }

  useEffect(refreshSuggestions, [])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const identity = await createIdentity(username)
      saveRankedIdentity(identity)
      onComplete(identity)
    } catch (caught) {
      const apiError = caught as RankedApiError
      setError(apiError.message)
      const alternatives = apiError.details?.suggestions
      if (Array.isArray(alternatives)) setSuggestions(alternatives.filter((item): item is string => typeof item === 'string'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="identity-page" aria-labelledby="identity-title">
      <div className="identity-fingerprint" aria-hidden="true"><Fingerprint /></div>
      <p className="eyebrow">OPEN YOUR CASE FILE</p>
      <h1 id="identity-title">Pick a detective name.</h1>
      <p>Claim one unique name for the weekly table. No email, password, or login screen.</p>
      <form onSubmit={submit}>
        <label htmlFor="detective-name">Detective name</label>
        <div className="identity-input"><UserRoundCheck/><input id="detective-name" value={username} onChange={event => setUsername(event.target.value)} placeholder="e.g. GoalSleuth27" autoComplete="nickname" minLength={3} maxLength={20} required /></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="name-suggestions" aria-label="Suggested detective names">
          {suggestions.map(suggestion => <button type="button" key={suggestion} onClick={() => { setUsername(suggestion); setError('') }}>{suggestion}</button>)}
          <button type="button" className="shuffle-name" onClick={refreshSuggestions} aria-label="Get new suggestions"><Shuffle size={15}/></button>
        </div>
        <button className="primary identity-submit" disabled={busy}>{busy ? <LoaderCircle className="spin"/> : <Fingerprint/>}{busy ? 'Claiming name…' : 'Claim this name'}</button>
      </form>
      <small>This name is remembered only by this browser. Clearing its site data means choosing a new one.</small>
    </section>
  )
}
