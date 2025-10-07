import React from "react";

export const TestApp: React.FC<object> = () => {
    const handleTestButtonClick = () => {
        window.alert("Test Message");
    };
    return <>
    <div>
        <p data-testid="dummy-text">This is a dummy test page</p>
        <div data-testid="test-btn">
            <button role="button" onClick={handleTestButtonClick}>Test</button>
            <button role="button" disabled>submit</button>
        </div>
    </div>
    </>
};

