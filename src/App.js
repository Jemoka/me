import React from 'react';
import './App.css';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEnvelope, faRss, faLink } from '@fortawesome/free-solid-svg-icons'
import { faTwitter, faMedium } from '@fortawesome/free-brands-svg-icons'



function App() {
    let greetings = ["Yo", "What's up", "Heyo", "Hey"];
  return (
    <div className="App">
        <div className="landing">
        <div className="centre-hero">
            <div className="impact">{greetings[Math.floor(Math.random() *greetings.length)]}, I am <div style={{fontWeight: 600, display: "inline"}}>Houjun Liu.</div></div>
                <div className="subtitle">Student, Software Engineer, Interface Designer, Content Creator</div>
                <div className="contact-tray">
                    <FontAwesomeIcon className="contact-icon contact-twitter" icon={faTwitter} />
                    <FontAwesomeIcon  className="contact-icon contact-medium" icon={faMedium} />
                    <FontAwesomeIcon  className="contact-icon contact-email" icon={faEnvelope} />
                    <FontAwesomeIcon  className="contact-icon contact-pod" icon={faRss} />
                </div>
        </div>
            <div style={{padding: 10, bottom: 5, left:5, position: "absolute", fontSize: 10}}>Under Construction. Obviously. <span style={{fontWeight: 400}}> 2020-2021 Houjun Liu.</span></div>
            </div>
    </div>
  );
}

export default App;
