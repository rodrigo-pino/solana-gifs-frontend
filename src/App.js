import { useEffect, useState } from 'react';
import twitterLogo from './assets/twitter-logo.svg';
import './App.css';
import idl from './idl.json';
import kp from "./keypair.json";
import {Connection, PublicKey, clusterApiUrl} from '@solana/web3.js';
import {Program, Provider, web3} from '@project-serum/anchor';

// Constants
const {SystemProgram, Keypair} = web3;
const arr = Object.values(kp._keypair.secretKey);
const secret = new Uint8Array(arr);
const baseAccount = web3.Keypair.fromSecretKey(secret);
const programID = new PublicKey(idl.metadata.address);
const network = clusterApiUrl('devnet');
const opts = {
    preflightCommitment : "processed"
};
const TWITTER_HANDLE = '_buildspace';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const App = () => {
    const [walletAddress, setWalletAddress] = useState(null);
    const [inputValue, setInputValue] = useState('');
    const [gifList, setGifList] = useState([]);
    const checkIfWalletIsConnected = async () => {
        console.log("BaseAccount",baseAccount.publicKey.toString());
        try {
            const {solana} = window;
            if (solana) {
                if (solana.isPhantom) {
                    console.log('Phantom Wallet found!');
                    const response = await solana.connect({onlyIfTrusted:true});
                    console.log(
                        'Conected with a Public Key:',
                        response.publicKey.toString()
                    );
                setWalletAddress(response.publicKey.toString());
                }
            } else {
                alert('Solana object not found! Get a Phantom Wallet');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const connectWallet = async () => {
        const {solana} = window;

        if (solana) {
            const response = await solana.connect();
            console.log(response.publicKey);
            console.log("Connected with Public Key:", response.publicKey.toString());
            setWalletAddress(response.publicKey.toString());
        }
    };

    const sendGif = async () => {
        if (inputValue.length > 0) {
            console.log("Gif link:", inputValue);
            try {
                const provider = getProvider();
                const program = new Program(idl, programID, provider);
                await program.rpc.addGif(
                    inputValue,
                    provider.wallet.publicKey, {
                    accounts: {
                        baseAccount: baseAccount.publicKey,
                    },
                });
                console.log("GIF succesfully sent to a program", inputValue);
                await getGifList();
            } catch (error) {
                console.log("Error sending GIF:", error);
            }
        } else {
            console.log("Empty input. Try Again.");
        }
    };

    const upvoteGif = async  (index) => {
        try {
            const provider = getProvider()
            const program = new Program(idl, programID, provider);
            await program.rpc.upvoteGif(
                index, {
                accounts: {
                    baseAccount: baseAccount.publicKey,
                }
            });
            console.log("Upvote gif", index)
        } catch (error) {
            console.log("Error upvoting gif:", error)
        }
    }

    const sendSol = async (reciever) => {
        let tipAmount = 5000;
        try {
            const provider = getProvider()
            const program = new Program(idl, programID, provider);
            await program.rpc.sendSol(
                tipAmount,
                {
                    accounts: {
                        from: provider.wallet.publicKey,
                        to: reciever,
                        systemProgram: SystemProgram.programId,
                    }
                }
            );
            console.log("Sol sended succesfully")
        } catch (error) {
            console.log("Error sending SOL:", error)
        }
    };

    const onInputChange = (event) => {
        const { value } = event.target;
        setInputValue(value);
    }

    const getProvider = () => {
        const connection = new Connection(network, opts.preflightCommitment);
        const provider = new Provider(
            connection, window.solana, opts.preflightCommitment,
        );
        return provider
    }

    const createGifAccount = async () => {
        try {
            const provider = getProvider();
            const program = new Program(idl, programID, provider);
            console.log("Creating/Connecting account");
            await program.rpc.initialize({
                accounts: {
                    baseAccount: baseAccount.publicKey,
                    user: provider.wallet.publicKey,
                    systemProgram: SystemProgram.programId,
                },
                signers: [baseAccount]
            });
            console.log("Created a new BaseAccount w/ address:", baseAccount.publicKey.toString());
            await getGifList();
        } catch (error) {
            console.log("Error creating a BaseAccount account:", error)
        }
    }

    const getGifList = async() => {
        try {
            const provider = getProvider();
            const program = new Program(idl, programID, provider);
            const account = await program.account.baseAccount.fetch(baseAccount.publicKey);

            console.log("Got the account", account);
            console.log("GifList:", account.gifList);
            setGifList(account.gifList);
        } catch (error) {
            console.error("Error in getGifs: ", error);
            setGifList(null);
        }
    };

    const renderNotConnectedContainer = () => (
        <button className="cta-button  connect-wallet-button" onClick={connectWallet}>
         Connect Wallet
        </button>
    );

    const renderConnectedContainer = () =>{
        if (gifList === null) {
            return (
                <div className="connected-container">
                    <button className="cta-button submit-gif-button"
                            onClick={createGifAccount}>
                        Do One-Time Initialization For GIF Program Account
                    </button>
                </div>
            )
        }
        else {
            return (
                <div className="connected-containers">
                    <input 
                        type="text"
                        placeholder="Enter gif link!"
                        value={inputValue}
                        onChange={onInputChange}
                    />
                    <button className="cta-button submit-gif-button"
                            onClick={sendGif}>
                        Submit
                    </button>
                    <div className="gif-grid">
                        {gifList.map((item, index) => (
                            <div className="gif-item"  key={index}>
                                <img src={item.gifLink} alt="random gif"/>
                                <p className="gif-sender">{item.userAddress.toString()}</p>
                                <button className="cta-button submit-gif-button"
                                        onClick={() => upvoteGif(index)}>
                                    Upvote({item.gifUpvotes.toString()})
                                </button>
                                <button className="cta-button submit-gif-button"
                                        onClick={() => sendSol(item.userAddress)}>
                                    Tip some Sol to user
                                </button>
                            </div>
                        ))}
                 </div>
                </div>
            )
        }
    };

    useEffect(() => {
        window.addEventListener('load', async (event) => {
            await checkIfWalletIsConnected();
        });
    },[]);

    useEffect(() => {
        if (walletAddress) {
            console.log("Fetching GIF list...");
            getGifList();
        }
    }, [walletAddress]);
    return (
    <div className="App">
      <div className={walletAddress? 'authored=container' : 'container'}>
        <div className="header-container">
          <p className="header">🖼 GIF Portal</p>
          <p className="sub-text">
            View your GIF collection in the metaverse ✨
          </p>
          {!walletAddress && renderNotConnectedContainer()}
          {walletAddress && renderConnectedContainer()}
        </div>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built on @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
);
};

export default App;
