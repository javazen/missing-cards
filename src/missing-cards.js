(function() {
  'use strict';
  
  const TRACE = true;
  const DEBUG = true;
  let TESTING = false;
  let origTableHTML;
  let wholeArray;
  
  document.addEventListener("DOMContentLoaded", function(event) {
    if (TRACE) console.log('DOMContentLoaded');
    
    // see if we are in TESTING node
    let ss = document.styleSheets;
    for (let i = 0; i < ss.length; i++) {
      let href = ss[i].href;
      if (href.endsWith("mocha.css")) {
        TESTING = true;
        break;
      }
    }
    
    if (TESTING) {
      // for use in mocha.html
      var expect = chai.expect;
      suite('Testing test.js', function() {

        suite('Testing choose', function() {
          var chooseArray = [
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
              var chosen = choose(aTest.arr, aTest.n);
              expect(chosen).to.deep.equal(aTest.result);
            });
          });
        });
      });
    } else {
      let outputBtn = document.getElementById("outputBtn");
      outputBtn.addEventListener('click', handleOutputBtn);
      let outputTable = document.getElementById("outputTable");
      origTableHTML = outputTable.innerHTML;
      
      // Also do it if user presses ENTER
      let inputField = document.getElementById("cardsStr");
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

  function handleOutputBtn(e) {
    let cardsStrInput = document.getElementById("cardsStr");
    let cardsStrValue = (cardsStrInput && cardsStrInput.value) ? cardsStrInput.value : '';
    if (DEBUG) console.log(cardsStrValue);
    if (cardsStrValue) {
      wholeArray = processInputString(cardsStrValue);
      let possiblesArray = getPossibilities(wholeArray);
      if (possiblesArray) listPossibilities(possiblesArray);
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
      let arrN = choose(cardArray, i);
      possiblesArray = possiblesArray.concat(arrN);
    }
    return possiblesArray;
  }
  
  function listPossibilities(possiblesArray) {
    let outputTable = document.getElementById("outputTable");
    outputTable.innerHTML = origTableHTML; // clear all but the headers
    
    let tableBody = document.getElementById("outputTableBody");
    for (let i=0; i<possiblesArray.length; i++) {
      let newRow = tableBody.insertRow();
      let newCell = newRow.insertCell();
      let westStr = (possiblesArray[i] && possiblesArray[i].length && possiblesArray[i].length > 0) ? possiblesArray[i] : '---';
      let westTextNode = document.createTextNode(westStr);
      newCell.appendChild(westTextNode);
      let newCell2 = newRow.insertCell();
      let theRest = subtract(wholeArray, possiblesArray[i]);
      let eastStr = (theRest && theRest.length && theRest.length > 0) ? theRest : '---';
      let eastTextNode = document.createTextNode(eastStr);
      newCell2.appendChild(eastTextNode);
    }
    // Hack because in getPossibilities, the last entry is not added.  concat(str, []) does nothing
    if (possiblesArray.length > 0 && possiblesArray[0].length) {
      let newRow = tableBody.insertRow();
      let newCell = newRow.insertCell();
      let westStr = '---';
      let westTextNode = document.createTextNode(westStr);
      newCell.appendChild(westTextNode);
      let newCell2 = newRow.insertCell();
      let eastStr = wholeArray.slice();
      let eastTextNode = document.createTextNode(eastStr);
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
    } else { // len > n and n > 1
      let firstElement = arr[0];
      let remainingArr = arr.slice(1);
      // let theRestArray = (remainingArr.length === 1) ? remainingArr.slice() : choose(remainingArr, n-1); // this special case is not actually needed
      let theRestArray = choose(remainingArr, n-1);
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
      let el = wholeArray[i];
      if (!partToSubtract.includes(el)) {
        newArray.push(el);
      }
    }
    
    return newArray;
  }
  
}());
