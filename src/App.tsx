import './App.css'
import ButtonsBar from './components/ButtonsBar'
import Terminal from './components/terminal'

const App = () => {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <ButtonsBar />
      <Terminal />
    </div>
  )
}

export default App