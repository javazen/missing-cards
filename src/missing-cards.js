(function() {
  'use strict';
  
  const TRACE = true;
  const DEBUG = true;
  const DEBUG_ANALYZE_ROW = false;
  let TESTING = false;
  let CONSTRAINTS = true;
  const WESTARR = 0;
  const EASTARR = 1;
  const WESTHAND = 0;
  const EASTHAND = 1;
  const ANYHAND = 2;
  const MODE_AT_MOST = 0;
  const MODE_AT_LEAST = 1;
  const MODE_EXACTLY = 2;
  const MILLISECONDS = 1000;
  let constraintsObj = { 
    dist:{check:false, hand:ANYHAND, mode:MODE_AT_MOST, count:2}, 
    points:{check:false, hand:WESTHAND, mode:MODE_AT_LEAST, count:3},
    cards:{check:false, west:'K', east:'3'} };
  let origTableHTML;
  let wholeArray;
  
  document.addEventListener("DOMContentLoaded", function(event) {
    if (TRACE) console.log('DOMContentLoaded');
    
    // set TESTING node flag if it's mocha.html
    checkTestingMode();
    
    if (TESTING) {
      runUnitTests();
    } else {
      setup();
    }
  });

  function setup() {
    const outputBtn = document.getElementById("outputBtn");
    outputBtn.addEventListener('click', handleOutputBtn);
    const outputTable = document.getElementById("outputTable");
    origTableHTML = outputTable.innerHTML;

    // fill constraintsObj from UI, set handlers to allow changes
    setupCB("enableDist", constraintsObj.dist);
    setupCB("enablePoints", constraintsObj.points);
    setupCB("enableCards", constraintsObj.cards);


    // ENTER when within the cardsStr input should be equivalent to clicking the Output button
    const inputField = document.getElementById("cardsStr");
    inputField.addEventListener("keyup", function(e) {
      e.preventDefault();
      const isEnter = e.code === "Enter" || e.key === "Enter";
      // e.which = e.which || e.keyCode; // old deprecated way
      if (isEnter) {
        outputBtn.click();
      }
    });
    // after user stops typing, adjust the constraints
    let timeout = null;
    inputField.addEventListener('keyup', function (e) {
      // Clear the timeout if it has already been set.
      // This will prevent the previous task from executing
      // if it has been less than <MILLISECONDS>
      clearTimeout(timeout);

      // Make a new timeout set to go off in MILLISECONDS
      timeout = setTimeout(function () {
          updateUI(inputField);
      }, MILLISECONDS);
    });
}

function setupCB(id, obj) {
  const cb = document.getElementById(id);
  const isChecked = cb.checked;
  obj.check = isChecked;
  cb.addEventListener('click', handleCB);
  function handleCB(e) {
    if (DEBUG) console.log('handleCB called for ' + id);
    const cb = document.getElementById(id);
    const isChecked = cb.checked;
    obj.check = isChecked;
  }
}


function updateUI(cardsStrInput) {
  const cardsStrValue = (cardsStrInput && cardsStrInput.value) ? cardsStrInput.value : '';
  if (cardsStrValue) {
    const wholeArray = processInputString(cardsStrValue);
    if (DEBUG) console.log('Whole Array:', wholeArray);
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
      const possibleOutputRowsArray = constrainPossibles(outputRowsArray, constraintsObj);
      if (possiblesArray) listPossibilities(possibleOutputRowsArray);
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
      const theRest = subtract(wholeArray, possiblesArray[i]);
      const eastArr = (theRest && theRest.length && theRest.length > 0) ? theRest : [];
      const outputRow = [westArr, eastArr];
      newArray.push(outputRow);
    }
    return newArray;
  }
  
  // Remove all the rows that do not pass the tests in constraintsObj
  function constrainPossibles(outputRowsArray, constraintsObj) {
    let newArray = outputRowsArray.slice();
    if (CONSTRAINTS && constraintsObj) {
      for (let i=outputRowsArray.length-1; i>=0; i--) {
        let row = outputRowsArray[i];
        let rowObj = analyzeRow(row);
        if (!allowed(constraintsObj, rowObj)) {
          newArray.splice(i, 1);
        }
      }
    }
    return newArray;
  }
  
  function listPossibilities(outputRowsArray) {
    const outputTable = document.getElementById("outputTable");
    outputTable.innerHTML = origTableHTML; // clear all but the headers
    
    const tableBody = document.getElementById("outputTableBody");
    for (let i=0; i<outputRowsArray.length; i++) {
      const newRow = tableBody.insertRow();
      const newCell = newRow.insertCell();
      const westArr = outputRowsArray[i][WESTARR];
      const westStr = (westArr && westArr.length) ? westArr.join(', ') : '---';
      const westTextNode = document.createTextNode(westStr);
      newCell.appendChild(westTextNode);
      const newCell2 = newRow.insertCell();
      const eastArr = outputRowsArray[i][EASTARR];
      const eastStr = (eastArr && eastArr.length) ? eastArr.join(', ') : '---';
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

  const pointsArray = {
    'A': 4,
    'K': 3,
    'Q': 2,
    'J': 1
  };

  function analyzeRow(row) {
    let rowObj = {raw:{}};
    const westArr = row[WESTARR];
    const eastArr = row[EASTARR];
    rowObj.raw.westArr = westArr;
    rowObj.raw.eastArr = eastArr;

    rowObj.west = {dist:westArr.length, points:0};
    rowObj.east = {dist:eastArr.length, points:0};
    rowObj.max = {dist:Math.max(rowObj.west.dist, rowObj.east.dist), points:0};
    // rowObj.min = {dist:Math.min(rowObj.west.dist, rowObj.east.dist), points:0};

    rowObj.west.points = countPoints(westArr);
    rowObj.east.points = countPoints(eastArr);
    rowObj.max.points = Math.max(rowObj.west.points, rowObj.east.points);
    // rowObj.min.points = Math.min(rowObj.west.points, rowObj.east.points);

    if (DEBUG_ANALYZE_ROW) debugOutputRow(rowObj);
    
    return rowObj;
  }

  function countPoints(cardArr) {
    let totalPoints = 0;
    for (let i=0; i<cardArr.length; i++) {
      const card = cardArr[i];
      const points = (pointsArray[card]) ? pointsArray[card] : 0;
      totalPoints += points;
    }
    return totalPoints;
  }
  
  function debugOutputRow(rowObj) {
    console.log('     row: westArr= ' + rowObj.raw.westArr + ' eastArr= ' + rowObj.raw.eastArr);
    console.log('W: dist= ' + rowObj.west.dist + ' points= ' + rowObj.west.points);
    console.log('E: dist= ' + rowObj.east.dist + ' points= ' + rowObj.east.points);
    console.log('max: dist= ' + rowObj.max.dist + ' points= ' + rowObj.max.points);
    // console.log('min: dist= ' + rowObj.min.dist + ' points= ' + rowObj.min.points);
  }
  
  function allowed(constraintsObj, rowObj) {
    const distOK = allowedInternal(constraintsObj.dist, rowObj, 'dist');
    const pointsOK = allowedInternal(constraintsObj.points, rowObj, 'points');
    const cardsOK = allowedGivenKnownCards(constraintsObj.cards, rowObj);
    return distOK && pointsOK && cardsOK;
  }
    
  function allowedInternal(obj, rowObj, field) {
    let ok = true;
    if (obj.check) {
      const hand = obj.hand;
      const mode = obj.mode;
      const count = obj.count;
      if (mode === MODE_AT_MOST) {
        if (hand === WESTHAND) ok = rowObj.west[field] <= count;
        else if (hand === EASTHAND) ok = rowObj.east[field] <= count;
        else if (hand === ANYHAND) ok = rowObj.max[field] <= count;
      } else if (mode === MODE_AT_LEAST) {
        if (hand === WESTHAND) ok = rowObj.west[field] >= count;
        else if (hand === EASTHAND) ok = rowObj.east[field] >= count;
        else if (hand === ANYHAND) ok = rowObj.max[field] >= count;
      } else if (mode === MODE_EXACTLY) {
        if (hand === WESTHAND) ok = rowObj.west[field] === count;
        else if (hand === EASTHAND) ok = rowObj.east[field] === count;
      }
    }
    return ok;
  }
  
  function allowedGivenKnownCards(cardsObj, rowObj) {
    let ok = true;
    if (cardsObj.check) {
      const westArr = processInputString(cardsObj.west);
      const eastArr = processInputString(cardsObj.east);
      const rowWestArr = rowObj.raw.westArr;
      const rowEastArr = rowObj.raw.eastArr;
      const westCardsOK = westArr.every(function(el) {
        return rowWestArr.includes(el);
      });
      const eastCardsOK = eastArr.every(function(el) {
        return rowEastArr.includes(el);
      });
      ok = ok && westCardsOK && eastCardsOK;
    }
    return ok;
  }

  
  //
  // Testing functions
  //
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

  function runUnitTests() {
    if (TRACE) console.log('runUnitTests');
    // for use in mocha.html
    const expect = chai.expect;
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
          // NB: getOutputRowsArray uppercases all letters, adds spaces after commas
          {str:'a', result: [ [['A'], []], [[], ['A']] ]},
          {str:'K,Q', result: [ 
            [['K', 'Q'], []], 
            [['K'], ['Q']], 
            [['Q'], ['K']], 
            [[], ['K', 'Q']] ]},
          {str:'K,Q, 3', result: [ 
            [['K', 'Q', '3'], []], 
            [['K', 'Q'], ['3']], 
            [['K', '3'], ['Q']], 
            [['Q', '3'], ['K']], 
            [['K'], ['Q', '3']], 
            [['Q'], ['K', '3']], 
            [['3'], ['K', 'Q']], 
            [[], ['K', 'Q', '3']] ]},
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
  }


}());

// let constraintsObj = { 
//   dist:{check:true, hand:ANYHAND, mode:MODE_AT_MOST, count:2}, 
//   points:{check:false, hand:WESTHAND, mode:MODE_AT_LEAST, count:3},
//   cards:{check:true, west:'K', east:'3'} };
