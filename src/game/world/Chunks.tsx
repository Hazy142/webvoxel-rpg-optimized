import React, { useEffect } from 'react';

const Chunks: React.FC = () => {
  useEffect(() => {
    console.log('Chunks component mounted');
  }, []);

  return null; // This is just a placeholder
};

export default Chunks;