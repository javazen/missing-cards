(function() {
  'use strict';
  
  const TRACE = true;
  const DEBUG = true;
  let TESTING = false;
  // let CONSTRAINTS = false;
  // let constraintsObj;
  let origTableHTML;
  let wholeArray;
  
  document.addEventListener("DOMContentLoaded", function(event) {
    if (TRACE) console.log('DOMContentLoaded');
    
    // set TESTING node flag if it's mocha.html
    checkTestingMode();
    
    if (TESTING) {
      // for use in mocha.html
      let expect = chai.expect;
      suite('Testing missing-cards.js', function() {

        suite('Testing choose', function() {
          const chooseArray = [
            {arr:['a'], n: 0, result: []},
            {arr:['a'], n: 1, result: [ ['a'] ]},
            {arr:['a', 'b'], n: 0, result: []},
            {arr:['a', 'b'], n: 1, result: [ ['a'], ['b'] ]},
            {arr:['a', 'b'], n: 2, result: [ ['a', 'b'] ]},
            {arr:['a', 'b', 'c'], n: 0, result: []},
            {arr:['a', 'b', 'c'], n: 1, result: [ ['a'], ['b'], ['c'] ]},
            {arr:['a', 'b', 'c'], n: 2, result: [ ['a', 'b'], ['a', 'c'], ['b', 'c'] ]},
            {arr:['a', 'b', 'c'], n: 3, result: [ ['a', 'b', 'c'] ]},
            {arr:['a', 'b', 'c', 'd'], n: 0, result: []},
            {arr:['a', 'b', 'c', 'd'], n: 1, result: [ ['a'], ['b'], ['c'], ['d'] ]},
            {arr:['a', 'b', 'c', 'd'], n: 2, result: [ ['a', 'b'], ['a', 'c'], ['a', 'd'], ['b', 'c'], ['b', 'd'], ['c', 'd'] ]},
            {arr:['a', 'b', 'c', 'd'], n: 3, result: [ ['a', 'b', 'c'], ['a', 'b', 'd'], ['a', 'c', 'd'], ['b', 'c', 'd'] ]},
          ];
          chooseArray.forEach(function(aTest) {
            aTest.testName = aTest.arr + ' n= ' + aTest.n +  ' -> ' + JSON.stringify(aTest.result);
          });
          chooseArray.forEach(function(aTest) {
            test(aTest.testName, function() {
              const chosen = choose(aTest.arr, aTest.n);
              expect(chosen).to.deep.equal(aTest.result);
            });
          });
        });

        suite('Testing getOutputRowsArray', function() {
          const outputRowsArray = [
            {str:'a', result: [ ['A', '---'], ['---', 'A'] ]},
            {str:'K,Q', result: [ ['K, Q', '---'], ['K', 'Q'], ['Q', 'K'], ['---', 'K, Q'] ]},
            {str:'K,Q, 3', result: [ 
              ['K, Q, 3', '---'], 
              ['K, Q', '3'], 
              ['K, 3', 'Q'], 
              ['Q, 3', 'K'], 
              ['K', 'Q, 3'], 
              ['Q', 'K, 3'], 
              ['3', 'K, Q'], 
              ['---', 'K, Q, 3'] ]},
          ];
          outputRowsArray.forEach(function(aTest) {
            aTest.testName = aTest.str + ' -> ' + JSON.stringify(aTest.result);
          });
          outputRowsArray.forEach(function(aTest) {
            test(aTest.testName, function() {
              const wholeArray = processInputString(aTest.str);
              const possibilitiesArray = getPossibilities(wholeArray);
              const outputRows = getOutputRowsArray(wholeArray, possibilitiesArray);
              expect(outputRows).to.deep.equal(aTest.result);
            });
          });
        });

      });
    } else {
      const outputBtn = document.getElementById("outputBtn");
      outputBtn.addEventListener('click', handleOutputBtn);
      const outputTable = document.getElementById("outputTable");
      origTableHTML = outputTable.innerHTML;
      
      // Also do it if user presses ENTER
      const inputField = document.getElementById("cardsStr");
      inputField.addEventListener("keyup", function(e) {
        e.preventDefault();
        const isEnter = e.code === "Enter" || e.key === "Enter";
        // e.which = e.which || e.keyCode; // old deprecated way
        if (isEnter) {
          outputBtn.click();
        }
      });
    }
  });

  function checkTestingMode() {
    const ss = document.styleSheets;
    for (let i = 0; i < ss.length; i++) {
      const href = ss[i].href;
      if (href.endsWith("mocha.css")) {
        TESTING = true;
        break;
      }
    }
  }

  function handleOutputBtn(e) {
    const cardsStrInput = document.getElementById("cardsStr");
    const cardsStrValue = (cardsStrInput && cardsStrInput.value) ? cardsStrInput.value : '';
    if (DEBUG) console.log(cardsStrValue);
    if (cardsStrValue) {
      wholeArray = processInputString(cardsStrValue);
      const possiblesArray = getPossibilities(wholeArray);
      const outputRowsArray = getOutputRowsArray(wholeArray, possiblesArray);
      // possibleOutputRowsArray = constrainPossibles(outputRowsArray, constraintsObj);
      if (possiblesArray) listPossibilities(outputRowsArray);
    }
  }
  
  // returns array of cards that are missing
  function processInputString(str) {
    let cardArray = str.split(',');
    cardArray = cardArray.map( el => el.trim().toUpperCase() );
    
    return cardArray;
  }
  
  function getPossibilities(cardArray) {
    let possiblesArray = [];
    
    for (let i=cardArray.length; i>=0; i--) {
      const arrN = choose(cardArray, i);
      if (arrN.length)  
        possiblesArray = possiblesArray.concat(arrN);
      else
        possiblesArray.push(arrN);
    }
    return possiblesArray;
  }

  function getOutputRowsArray(wholeArray, possiblesArray) {
    let newArray = [];
    for (let i=0; i<possiblesArray.length; i++) {
      const westArr = (possiblesArray[i] && possiblesArray[i].length && possiblesArray[i].length > 0) ? possiblesArray[i] : [];
      const westStr = (westArr && westArr.length) ? westArr.join(', ') : '---';
      const theRest = subtract(wholeArray, possiblesArray[i]);
      const eastArr = (theRest && theRest.length && theRest.length > 0) ? theRest : [];
      const eastStr = (eastArr && eastArr.length) ? eastArr.join(', ') : '---';
      const outputRow = [westStr, eastStr];
      newArray.push(outputRow);
    }
    return newArray;
  }
  
  // function constrainPossibles(outputRowsArray, constraintsObj) {
  //   let newArray = outputRowsArray.slice();
  //   if (constraintsObj) {
      
  //   }
  //   return newArray;
  // }
  
  function listPossibilities(outputRowsArray) {
    const outputTable = document.getElementById("outputTable");
    outputTable.innerHTML = origTableHTML; // clear all but the headers
    
    const tableBody = document.getElementById("outputTableBody");
    for (let i=0; i<outputRowsArray.length; i++) {
      const newRow = tableBody.insertRow();
      const newCell = newRow.insertCell();
      const westStr = outputRowsArray[i][0];
      const westTextNode = document.createTextNode(westStr);
      newCell.appendChild(westTextNode);
      const newCell2 = newRow.insertCell();
      const eastStr = outputRowsArray[i][1];
      const eastTextNode = document.createTextNode(eastStr);
      newCell2.appendChild(eastTextNode);
    }
  }
  
  // returns an array of possible n-length arrays chosen from the elements of choose
  function choose(arr, n) {
    let newArray = [];
    if (n === 0) return newArray;
    
    const len = arr.length;
    if (len < n) {
      console.log('oops, cannot choose ' + n +  ' when len= ' + len);
    } else if (len === n) {
      newArray = [arr.slice()];
    } else if (n === 1) { // len > n and n === 1
      arr.forEach((item, i) => {
        newArray.push([item]);
      });
    } else { // 1 < n < len
      const firstElement = arr[0];
      const remainingArr = arr.slice(1);
      // let theRestArray = (remainingArr.length === 1) ? remainingArr.slice() : choose(remainingArr, n-1); // this special case is not actually needed
      const theRestArray = choose(remainingArr, n-1);
      newArray = theRestArray.map(function(el) {
        let tempArray = [firstElement];
        return tempArray.concat(el);
      });
      if (remainingArr.length >= n) {
        let withoutFirstArr = choose(remainingArr, n);
        newArray = newArray.concat(withoutFirstArr);
      }
    }
    
    return newArray;
  }
  
  function subtract(wholeArray, partToSubtract) {
    let newArray = [];
    
    for (let i=0; i<wholeArray.length; i++) {
      const el = wholeArray[i];
      if (!partToSubtract.includes(el)) {
        newArray.push(el);
      }
    }
    
    return newArray;
  }
  
}());
