const ideas = [
  {
    number: '01',
    title: 'Separate the song',
    description: 'Explore individual parts — piano, guitar, bass, drums and voice — so you can focus on what matters to you.',
    tag: 'Audio stems'
  },
  {
    number: '02',
    title: 'See the notes',
    description: 'The goal: turn a piano part into a clear, synchronized note view that helps you learn it one phrase at a time.',
    tag: 'Piano learning'
  },
  {
    number: '03',
    title: 'Play at your pace',
    description: 'Practice with slower tempos, short loops and chord names that follow the music.',
    tag: 'Practice tools'
  }
];

export default function App() {
  return (
    <main>
      <header className="topbar">
        <a className="brand" href="/" aria-label="Quasaric home">
          <span className="brand-mark">Q</span>
          <span>quasaric</span>
        </a>
        <span className="status"><span className="status-dot" /> In the making</span>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">A new way to learn the music you love</p>
          <h1>Play the song.<br /><span>Learn your part.</span></h1>
          <p className="intro">
            Focus on the instrument you want to play. Quasaric is being built
            to help you explore a song, isolate its parts and learn them at
            your own pace.
          </p>
          <a className="primary-link" href="#vision">Explore the idea <span aria-hidden="true">↘</span></a>
        </div>

        <div className="music-card" aria-label="Illustration of musical notes">
          <div className="card-top"><span>YOUR NEXT PRACTICE</span><span className="equalizer"><i /><i /><i /><i /><i /></span></div>
          <div className="staff">
            <div className="staff-lines" />
            <div className="falling-notes">
              <span className="note note-one">♪</span>
              <span className="note note-two">♫</span>
              <span className="note note-three">♪</span>
              <span className="note note-four">♬</span>
              <span className="note note-five">♪</span>
            </div>
            <div className="keyboard">
              {Array.from({ length: 14 }, (_, index) => <span className="key" key={index} />)}
            </div>
          </div>
          <div className="card-bottom"><span>LISTEN</span><span>LEARN</span><span>PLAY</span></div>
        </div>
      </section>

      <section className="vision" id="vision">
        <div className="section-heading">
          <p className="eyebrow">The idea</p>
          <h2>From listening<br />to playing.</h2>
          <p>Less guesswork. More time with your instrument.</p>
        </div>
        <div className="idea-list">
          {ideas.map((idea) => (
            <article className="idea" key={idea.number}>
              <span className="idea-number">{idea.number}</span>
              <div><h3>{idea.title}</h3><p>{idea.description}</p></div>
              <span className="idea-tag">{idea.tag}</span>
            </article>
          ))}
        </div>
      </section>

      <footer>
        <a className="brand footer-brand" href="/"><span className="brand-mark">Q</span><span>quasaric</span></a>
        <span>Made for the joy of playing.</span>
        <span>© {new Date().getFullYear()} Quasaric</span>
      </footer>
    </main>
  );
}
