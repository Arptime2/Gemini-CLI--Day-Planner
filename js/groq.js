
async function callGroqAPI(prompt) {
    const apiKey = localStorage.getItem('groq_api_key');
    if (!apiKey) {
        alert('Groq API key not found. Please set it in Settings.');
        return null;
    }

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'llama3-8b-8192', // Or another suitable model
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Groq API Error:', errorData);
            alert(`API Error: ${errorData.error.message}`);
            return null;
        }

        const data = await response.json();
        return data.choices[0].message.content;

    } catch (error) {
        console.error('Error calling Groq API:', error);
        alert('An error occurred while contacting the Groq API.');
        return null;
    }
}

window.groq = { callGroqAPI };
