//npm run build

import React, { Component } from 'react';
import Chat from './components/Chat';
import GenerateKeys from './components/GenerateKeys';
import CreateMessage from './components/CreateMessage';
import CanvasBackground from './components/CanvasBackground';

import './App.css';
import Peer from 'simple-peer'; 
import socketIOClient from 'socket.io-client';
import $ from 'jquery';

class App extends Component {
  

  constructor(props) {
    super(props);
    this.state = {
      chatMessages: [ 
      ],
      peerInfo: null,
      stream: null,
      peer: null,
      peerStream: null
    }
    
  }

  componentDidMount() {

    navigator.mediaDevices.getUserMedia({video:true, audio: true}).then(stream => {
      this.clientRef.srcObject = stream;
      this.clientRef.onloaddedmetadata = this.clientRef.play();
      this.forceUpdate();
      this.socketConnection(stream);

    })
  }

  socketConnection(stream) {
    var socket = socketIOClient.connect("https://localhost:8080", {rejectUnauthorized: false});
    console.log("Connecting to server...");

    socket.on('peer', (data) => {
      this.createPeer(data.initiator, stream);
      
      console.log("Server told client to become initiator: " + data.initiator);
      if(data.initiator) {
        this.state.peer.on("signal", (data) => {
          socket.emit("initiatorData", data);
          console.log("Emitting Initiator data to Server...");
        })
      }
    });

      socket.on('joinInitiator', (data) => {
        console.log("Joinining the initiator...");
        console.log(data.data);
        this.state.peer.signal(data.data);
        
        if(!data.initiator) {
          var initiaitorSocketId = data.socketid;
          this.state.peer.on('signal', (data) => {
            socket.emit("backToInitiator", {socketid: initiaitorSocketId, data: data});
            console.log("Recieving Initiator's Data..");
          })
        }
      })

      socket.on('toInitiatorFromServer', (data) => {
        this.state.peer.signal(data.data);

        console.log("Connecting to Peer...");
      })
    
  }

  submitButton = () => {
    console.log("Can Submit")
  }

  //Needs to be finished
  createPeer = (initiator, stream) => {
  var peer = new Peer({initiator: initiator, trickle: false, stream: stream});

  this.forceUpdate();
  
    peer.on("connect", () => {
        console.log("Successfully connected to peer!");
    })

    peer.on("data", (data) => {
      data = JSON.parse(data);
      const newMessage = {
        id: this.state.chatMessages.length,
        user: data.user,
        message: data.message 
      }
      this.setState({chatMessages: [...this.state.chatMessages, newMessage]});
    });

    peer.on("stream", (data) => {
      this.setState({peerStream: data});
      this.peerRef.srcObject = this.state.peerStream;
      this.peerRef.onloaddedmetadata = this.peerRef.play();
    });

    this.setState({peer: peer});
    return peer;
  }


  createMessage = (user, content) => {

      const newMessage = {
        id: this.state.chatMessages.length,
        user: user,
        message: content 
      }
      this.setState({chatMessages: [...this.state.chatMessages, newMessage]});
      this.state.peer.send(JSON.stringify({user: 'Anon', message: content}));
     
  }



  render() {
    return (
      <div className="App">
      
      <div id = "videoChat">
        <h3 id = "logo">パラドックス</h3>
        <video ref = {clientRef => {this.clientRef = clientRef}} controls muted></video>
        <video ref = {peerRef => {this.peerRef = peerRef}} controls></video>
      </div>
        <div id = "chatApp" class = "disableScrollbars">
          <Chat chatMessages = {this.state.chatMessages} submit = {this.submitButton} />
        </div>
        
        <CreateMessage createMessage =  {this.createMessage} peer = {this.peer} />

        <GenerateKeys />
        <CanvasBackground />
      </div>
    );
  }
}

export default App;