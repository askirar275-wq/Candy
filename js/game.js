document.addEventListener('DOMContentLoaded', () => {
    const grid = document.querySelector('.grid');
    const width = 8; // ग्रिड की चौड़ाई (8x8)
    const squares = [];
    let score = 0;
    
    // कैंडीज के लिए विभिन्न रंग (आप यहाँ छवियों (images) का भी उपयोग कर सकते हैं)
    const candyColors = [
        'red',
        'yellow',
        'orange',
        'purple',
        'green',
        'blue'
    ];

    // **बोर्ड (Grid) बनाने का फंक्शन**
    function createBoard() {
        for (let i = 0; i < width * width; i++) {
            const square = document.createElement('div');
            
            // ड्रैग और ड्रॉप के लिए ज़रूरी
            square.setAttribute('draggable', true); 
            square.setAttribute('id', i);
            
            // रैंडम कैंडी रंग देना
            let randomColor = Math.floor(Math.random() * candyColors.length);
            square.style.backgroundColor = candyColors[randomColor];
            square.classList.add('candy');
            
            grid.appendChild(square);
            squares.push(square);
        }
    }

    createBoard();
    
    // --- यहाँ ड्रैग और ड्रॉप लॉजिक (Drag and Drop Logic) आएगा ---
    
    /*
    एक सरल ड्रैग और ड्रॉप फ़्लो (Simple Drag and Drop Flow):
    
    let colorBeingDragged;
    let colorBeingReplaced;
    let squareIdBeingDragged;
    let squareIdBeingReplaced;

    squares.forEach(square => square.addEventListener('dragstart', dragStart));
    squares.forEach(square => square.addEventListener('dragend', dragEnd));
    squares.forEach(square => square.addEventListener('dragover', dragOver));
    squares.forEach(square => square.addEventListener('dragenter', dragEnter));
    squares.forEach(square => square.addEventListener('dragleave', dragLeave));
    squares.forEach(square => square.addEventListener('drop', dragDrop));

    function dragStart() {
        colorBeingDragged = this.style.backgroundColor;
        squareIdBeingDragged = parseInt(this.id);
    }
    
    function dragDrop() {
        colorBeingReplaced = this.style.backgroundColor;
        squareIdBeingReplaced = parseInt(this.id);
        
        // स्वैप (Swap) करने के लिए:
        squares[squareIdBeingDragged].style.backgroundColor = colorBeingReplaced;
        squares[squareIdBeingReplaced].style.backgroundColor = colorBeingDragged;
        
        // फिर 'checkMatch' और 'dragEnd' कॉल करें
    }
    
    // ... अन्य लॉजिक (check for 3/4 matches, move candies down, etc.) यहाँ आएगा।
    */

    // **ध्यान दें:** पूरा मैच-3 (Match-3) लॉजिक (जैसे तीन का मिलान, गिरना, स्कोरिंग) काफी जटिल है और उसे सही ढंग से लागू करने के लिए और अधिक कोड की आवश्यकता होगी। यह कोड आपको गेम का विज़ुअल सेटअप (visual setup) देगा।
});
