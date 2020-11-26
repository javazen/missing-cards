(function() {
  'use strict';
  
  const TRACE = true;
  const DEBUG = true;
  const TESTING = true;
  let origTableHTML;
  let wholeArray;
  
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

  
  // TODO accept "K 10 3" also
  
  document.addEventListener("DOMContentLoaded", function(event) {
    if (TRACE) console.log('DOMContentLoaded');
    if (!TESTING) {
      let outputBtn = document.getElementById("outputBtn");
      outputBtn.addEventListener('click', handleOutputBtn);
      let outputTable = document.getElementById("outputTable");
      origTableHTML = outputTable.innerHTML;
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
      let firstElement = arr[0]; // 'K'
      let remainingArr = arr.slice(1); // ['J']
      let theRestArray = (remainingArr.length === 1) ? remainingArr.slice() : choose(remainingArr, n-1); // 
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
  
  // augmentArray([b0, b1], [x,y,z]) -> [ [b0, b1, x], [b0, b1, y], [b0, b1, z] ]
  // function augmentArray(baseArray, additionalElements) {
  //   let newArray = additionalElements.map( function(el) {
  //     let tempArray = baseArray.slice();
  //     tempArray.push(el);
  //     return tempArray;
  //   } );
  //   return newArray;
  // }
  
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
