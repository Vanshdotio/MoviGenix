import React from 'react'

const Loader = () => {
  return (
    <div className="flex items-center justify-center w-full h-screen bg-black">
        <video 
            src="/assets/loader/Untitled%20file.webm" 
            autoPlay 
            loop 
            muted 
            playsInline
            className="w-25 h-25 object-cover rounded-full"
        ></video>
    </div>
  )
}

export default Loader;