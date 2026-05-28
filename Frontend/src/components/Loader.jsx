import React from 'react'

const Loader = () => {
  return (
    <div className="flex items-center justify-center w-full h-screen bg-black">
        <img 
            src="/assets/loader/loader.webp" 
            alt="Loading..."
            className="w-25 h-25 object-contain"
        />
    </div>
  )
}

export default Loader;