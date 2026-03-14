import React from 'react';

const Card = ({ children, className = "", hover = false, onClick }) => (
    <div
        onClick={onClick}
        className={`card ${hover ? 'card-hover cursor-pointer' : ''} ${className}`}
    >
        {children}
    </div>
);

export default Card;
