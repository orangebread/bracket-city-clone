import React, { useState, useEffect, useCallback } from 'react';

// Define the NEW puzzle and answers
const initialPuzzle = "[drink from a [farm animal that makes a [sound a sheep makes] sound]]. The quick brown [animal that jumps] jumps over the lazy [animal that barks]."
const clueAnswers: Record<string, string> = {
    "sound a sheep makes": "baa",
    "farm animal that makes a baa sound": "sheep",
    "drink from a sheep": "milk",
    "animal that jumps": "fox",
    "animal that barks": "dog",
    // Adding a few more simple ones for variety
    "opposite of black": "white",
    "color of the sun": "yellow",
    "a common red fruit": "apple", // Added clue
};
// Add one more puzzle element involving the new clues
const fullInitialPuzzle = initialPuzzle + " Is the sky [opposite of black] or [color of the sun]? I prefer [a common red fruit].";


// Helper function to find ALL unsolved clues (any text in brackets)
const findAllUnsolvedClues = (puzzleString: string): { fullClue: string; text: string; startIndex: number }[] => {
  const clues: { fullClue: string; text: string; startIndex: number }[] = [];
  // Regex to find text within the innermost brackets OR any brackets if none are nested
   // Updated regex to find *any* bracket pair non-greedily
  const regex = /\[(.*?)\]/g;
  let match;
  while ((match = regex.exec(puzzleString)) !== null) {
     // Basic check: Only add if the content is a key in our answers (i.e., it's an actual clue)
     // This prevents highlighting things like "[submit]" if it were part of the puzzle text.
     if (clueAnswers.hasOwnProperty(match[1])) {
        clues.push({ fullClue: match[0], text: match[1], startIndex: match.index });
     }
  }
  // Filter out clues that are nested inside another found clue for highlighting purposes,
  // but keep them for guessing. Let's try highlighting all for now as requested.
  return clues;
};


export default function Home() {
  // Use the combined puzzle
  const [puzzleDisplay, setPuzzleDisplay] = useState<string>(fullInitialPuzzle);
  const [userInput, setUserInput] = useState<string>("");
  const [feedback, setFeedback] = useState<string>("");
  // Renamed state to hold all clues for highlighting/guessing
  const [highlightedClues, setHighlightedClues] = useState<{ fullClue: string; text: string; startIndex: number }[]>([]);
  const [isSolved, setIsSolved] = useState<boolean>(false);

  // Update highlighted clues whenever the puzzle display changes
  useEffect(() => {
    const newHighlightedClues = findAllUnsolvedClues(puzzleDisplay);
    setHighlightedClues(newHighlightedClues);

    // More robust win condition check: No brackets left and it's not the initial state
    const hasBrackets = puzzleDisplay.includes('[') || puzzleDisplay.includes(']');
    if (!hasBrackets && puzzleDisplay !== fullInitialPuzzle) {
        setIsSolved(true);
        setFeedback("🎉 Puzzle Solved! 🎉");
    } else if (isSolved && hasBrackets) {
        // Reset solved state if brackets reappear somehow
        setIsSolved(false);
    }
  }, [puzzleDisplay, isSolved, fullInitialPuzzle]); // Added dependencies

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUserInput(event.target.value);
  };

  // Updated handleGuess to check against ALL highlightedClues
  const handleGuess = useCallback(() => {
    if (isSolved) return;

    const guess = userInput.trim().toLowerCase();
    let correctGuessMade = false;

    // Find all potential clues based on current display *at the time of guessing*
    // This ensures we work with the most up-to-date clue list
    const currentClues = findAllUnsolvedClues(puzzleDisplay);

    for (const clue of currentClues) {
      const correctAnswer = clueAnswers[clue.text]?.toLowerCase();
      // Check if the current clue's text (key) exists in answers and matches the guess
      if (correctAnswer !== undefined && correctAnswer === guess) {
        // Replace the first occurrence of this specific full clue string
        setPuzzleDisplay((currentDisplay) =>
          currentDisplay.replace(clue.fullClue, clueAnswers[clue.text])
        );
        setFeedback("✅ Correct!");
        setUserInput("");
        correctGuessMade = true;
        // Break after the first match is found and replaced.
        // Processing multiple identical clues with one guess might be confusing.
        break;
      }
    }

    if (!correctGuessMade && guess !== "") {
      setFeedback("❌ Incorrect guess. Try again!");
    } else if (guess === "") {
         setFeedback(""); // Clear feedback if input is empty
    }

  }, [userInput, puzzleDisplay, isSolved]); // Dependencies updated: check against current puzzleDisplay

   // Allow submission with Enter key
   const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleGuess();
    }
  };

  // Updated renderPuzzle to use highlightedClues state
  const renderPuzzle = () => {
     // Always use the state for rendering highlights
    const cluesToHighlight = highlightedClues;

    if (isSolved) {
        // Display solved puzzle with specific styling
        return <span className="text-2xl font-bold text-green-600">{puzzleDisplay}</span>;
    }

    if (cluesToHighlight.length === 0) {
         // If no clues are highlighted (e.g., initial load error or already solved but flag not set)
         // return the plain display. Also check if it's actually solved.
         if (!puzzleDisplay.includes('[') && !puzzleDisplay.includes(']')) {
             // Check against initial state to be sure it's not the very beginning
             if (puzzleDisplay !== fullInitialPuzzle) {
                 setIsSolved(true); // Correct the state if needed
                 return <span className="text-2xl font-bold text-green-600">{puzzleDisplay}</span>;
             }
         }
        return puzzleDisplay;
    }


    let lastIndex = 0;
    const parts: React.ReactNode[] = [];
    // Sort clues by start index to render them in order
     const sortedClues = [...cluesToHighlight].sort((a, b) => a.startIndex - b.startIndex);


    sortedClues.forEach((clue, index) => {
       // Prevent rendering overlapping highlights which can happen with simpler regex
        if (clue.startIndex < lastIndex) {
           return; // Skip this clue if it overlaps with the previous one
        }
      // Add text before the clue
      parts.push(puzzleDisplay.substring(lastIndex, clue.startIndex));
      // Add the highlighted clue - ensure text contrast
      parts.push(
        <span key={`${clue.startIndex}-${index}`} className="bg-yellow-200 px-1 rounded text-black font-medium">
          {clue.fullClue}
        </span>
      );
      lastIndex = clue.startIndex + clue.fullClue.length;
    });
    // Add any remaining text after the last clue
    parts.push(puzzleDisplay.substring(lastIndex));

    return parts;
  };


  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-100">
       <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-3xl"> {/* Increased max-width slightly */}

        {/* Instructions */}
        <div className="mb-6 p-4 border border-purple-300 bg-purple-50 rounded-md">
            <h2 className="text-lg font-semibold mb-2 text-purple-800">How To Play</h2>
            <p className="text-purple-700">In Bracket City you can solve <span className="font-bold">any clue</span> just by submitting an answer.</p>
            {/* Updated instruction text */}
            <p className="text-purple-700">Type the answer to any <span className="font-bold bg-yellow-200 px-1 rounded text-black">highlighted clue</span> and hit enter!</p>
            <p className="text-purple-700">Keep guessing until you get one!</p>
        </div>


        {/* Puzzle Display */}
        {/* Increased text size slightly */}
        <div className="mb-6 p-6 border border-gray-300 bg-gray-50 rounded text-2xl font-mono whitespace-pre-wrap break-words text-gray-800 leading-relaxed">
            {renderPuzzle()}
        </div>

        {/* Input Area */}
        <div className="flex gap-2 mb-4">
           <input
             type="text"
             value={userInput}
             onChange={handleInputChange}
             onKeyDown={handleKeyDown}
             placeholder="Type any answer..."
             // Increased input text size
             className="flex-grow p-3 border border-gray-300 rounded shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-lg disabled:bg-gray-200"
             disabled={isSolved} // Disable input when solved
           />
           <button
             onClick={handleGuess}
              // Increased button text size
             className="px-6 py-3 bg-blue-600 text-white font-semibold rounded shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
              disabled={isSolved} // Disable button when solved
             >
             [submit]
            </button>
        </div>

         {/* Feedback Area */}
         {/* Increased feedback text size */}
         <div className="h-8 text-center text-lg font-medium">
             {/* Conditional styling for feedback */}
             <span className={feedback.includes("✅") ? "text-green-600" : feedback.includes("❌") ? "text-red-600" : "text-gray-700"}> 
                {feedback}
             </span>
         </div>

      </div>
    </main>
  );
}
