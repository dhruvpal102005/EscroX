export default function Card({ children, className = '', hover = false, onClick }) {
    return (
        <div onClick={onClick}
            className={`card ${hover ? 'card-hover cursor-pointer' : ''} ${className}`}>
            {children}
        </div>
    );
}
