(function() {
  'use strict';
  
  const TRACE = true;
  const DEBUG = true;
  const DEBUG_ANALYZE_ROW = false;
  let TESTING = false;
  let CONSTRAINTS = true;
  const EDIT_WAIT_MILLISECONDS = 1000;
  const ALLOW_EMPTY_VALUE = true;

  const WESTARR = 0;
  const EASTARR = 1;
  
  const WESTHAND = 'West';
  const EASTHAND = 'East';
  const ALL_HANDS = [WESTHAND, EASTHAND];

  const WEST_AT_MOST = 'West has at most';
  const WEST_AT_LEAST = 'West has at least';
  const EAST_AT_MOST = 'East has at most';
  const EAST_AT_LEAST = 'East has at least';

  const MODE_AT_MOST = 'at most';
  const MODE_AT_LEAST = 'at least';
  const MODE_EXACTLY = 'exactly';

  // initial default state
  let stateObj = {
    missingCards:'K 9 3 2',
    dist:{check:false, mode:MODE_AT_MOST, count:3}, 
    points:{check:false, hand:WESTHAND, mode:MODE_AT_LEAST, count:3},
    cards:{check:false, west:'', east:''} };
  let origTableHTML;
  let wholeArray;
  let copyToClipboardBtn;
  
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
    const outputTable = document.getElementById("outputTable");
    origTableHTML = outputTable.innerHTML;

    setupInputText('cardsStr', stateObj, 'missingCards');
    copyToClipboardBtn = document.getElementById("copyToClipboard");
    copyToClipboardBtn.addEventListener('click', handleCopyToClipboard);
  
    if (CONSTRAINTS) {
      document.getElementById('right-side').style.display = "block";
      // setup UI from stateObj defaults, set handlers to allow changes
      setupCB("enableDist", stateObj.dist);
      setupDropdown('whichDistMode', stateObj.dist, 'mode');
      setupInputText('distCount', stateObj.dist, 'count');

      setupCB("enablePoints", stateObj.points);
      setupDropdown('whichOpponentForPoints', stateObj.points, 'hand');
      setupDropdown('whichMatchForPoints', stateObj.points, 'mode');
      setupInputText('pointsCount', stateObj.points, 'count');

      setupCB("enableCards", stateObj.cards);    
      setupInputText('westMustHaveCards', stateObj.cards, 'west', ALLOW_EMPTY_VALUE);
      setupInputText('eastMustHaveCards', stateObj.cards, 'east', ALLOW_EMPTY_VALUE);
    }

    updateResults();
  }

  function handleCopyToClipboard(e) {
    const tableContents = getTableContents("outputTable");
    // console.log(tableContents);
    writeClipboardText(tableContents);
  }

  // returns contents of the table in TSV format
  // will not handle nested tables correctly
  // ? inserts blank column between West and East ?
  function getTableContents(table_id, separator = '\t') {
    const tableBody = document.querySelector('#'+table_id);
    const tableArr = [];
    const rows = tableBody.querySelectorAll('tr');
    for (let i=0; i<rows.length; i++) {
      const rowArr = [];
      // const cols = rows[i].querySelectorAll('tr'); // not sure why it does not work
      const cols = rows[i].children;
      for (let j=0; j<cols.length; j++) {
        let data = cols[j].innerText;
        rowArr.push(data);
      }
      const rowStr = rowArr.join(separator);
      tableArr.push(rowStr);
    }
    return tableArr.join('\n');
  }

  async function writeClipboardText(text) {
    copyToClipboardBtn.focus();
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error(error.message);
    }
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
      updateResults(e);
    }
  }

  function setupDropdown(id, obj, field) {
    const dropdown = document.getElementById(id);
    dropdown.value = obj[field];
    dropdown.addEventListener('change', (e) => {
      const value = e.target.value;
      if (DEBUG) console.log('' + id + ' select called, new value= ' + value);
      obj[field] = value;
      updateResults(e);
    });
  }
    

  function setupInputText(inputId, obj, field, allowEmptyValue) {
    const inputElement = document.getElementById(inputId);

    // initialize to default value
    inputElement.value = obj[field];

    // after user stops typing, set and update
    let timeout = null;
    inputElement.addEventListener('keyup', function (e) {
      // Clear the timeout if it has already been set.
      // This will prevent the previous task from executing
      // if it has been less than <EDIT_WAIT_MILLISECONDS>
      clearTimeout(timeout);

      // Make a new timeout set to go off in EDIT_WAIT_MILLISECONDS
      timeout = setTimeout(function () {
        updateTextField(inputElement, obj, field, e, allowEmptyValue);
      }, EDIT_WAIT_MILLISECONDS);
    });
  }
    
  function updateTextField(newText, obj, field, e, allowEmptyValue) {
    if (newText) {
      const doUpdate = newText.value || allowEmptyValue;
      const newTextValue = (newText.value) ? newText.value : '';
      if (doUpdate) {
        obj[field] = newTextValue;
        if (DEBUG) console.log('field set to ', newTextValue);
        updateResults(e);
      } else {
        // tried to blank a field which doesn't support empty string - 
        // just go back to old value
        newText.value = obj[field];
      }
    } else {
      if (DEBUG) console.log('updateTextField called without valid text field');
    }
  }

  function updateResults(e) {
    const cardsStrInput = document.getElementById("cardsStr");
    const cardsStrValue = (cardsStrInput && cardsStrInput.value) ? cardsStrInput.value : '';
    if (DEBUG) console.log(cardsStrValue);
    if (cardsStrValue) {
      wholeArray = processInputString(cardsStrValue);
      const possiblesArray = getPossibilities(wholeArray);
      const outputRowsArray = getOutputRowsArray(wholeArray, possiblesArray);
      const possibleOutputRowsArray = constrainPossibles(outputRowsArray, stateObj);
      if (possiblesArray) listPossibilities(possibleOutputRowsArray);
    }
    // writeClipboardText(cardsStrValue);
  }
  
  // returns array of cards that are missing
  // will accept comma- or space-delimited lists of cards, but not a mixture
  function processInputString(str) {
    const useCommas = str.includes(',');
    const delim = (useCommas) ? ',' : ' ';
    let cardArray = str.split(delim);
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
  
  // Remove all the rows that do not pass the tests in stateObj
  function constrainPossibles(outputRowsArray, stateObj) {
    let newArray = outputRowsArray.slice();
    if (CONSTRAINTS && stateObj) {
      for (let i=outputRowsArray.length-1; i>=0; i--) {
        let row = outputRowsArray[i];
        let rowObj = analyzeRow(row);
        if (!allowed(stateObj, rowObj)) {
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

  function analyzeRow(row) {
    const westArr = row[WESTARR];
    const eastArr = row[EASTARR];
    const rowObj = {
      raw:{westArr:westArr, eastArr:eastArr},
      west:{dist:westArr.length, points:countPoints(westArr)},
      east:{dist:eastArr.length, points:countPoints(eastArr)}
    };

    if (DEBUG_ANALYZE_ROW) debugOutputRow(rowObj);
    
    return rowObj;
  }

  const pointsArray = {
    'A': 4,
    'K': 3,
    'Q': 2,
    'J': 1
  };

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
  }
  
  function allowed(stateObj, rowObj) {
    const distOK = allowedDist(stateObj.dist, rowObj, 'dist');
    const pointsOK = allowedPoints(stateObj.points, rowObj, 'points');
    const cardsOK = allowedGivenKnownCards(stateObj.cards, rowObj);
    return distOK && pointsOK && cardsOK;
  }
    
  function allowedDist(obj, rowObj, field) {
    if (obj.check) {
      const count = +obj.count;
      const mode = obj.mode;
      switch (mode) {
        case MODE_AT_MOST: return rowObj.west[field] <= count && rowObj.east[field] <= count;
        case WEST_AT_MOST: return rowObj.west[field] <= count;
        case WEST_AT_LEAST: return rowObj.west[field] >= count;
        case EAST_AT_MOST: return rowObj.east[field] <= count;
        case EAST_AT_LEAST: return rowObj.east[field] >= count;
        default: 
          if (DEBUG) console.log('allowedDist called with unsupported mode ' + mode);
          // return true, checking against invalid is taken as not checking
      }
    }
    return true;
  }
  
  function allowedPoints(obj, rowObj, field) {
    let ok = true;
    if (obj.check) {
      const hand = obj.hand;
      const mode = obj.mode;
      const count = +obj.count;

      // sanity check
      if (!ALL_HANDS.includes(hand)) {
        if (DEBUG) console.log('allowedPoints called with unsupported hand ' + hand);
        return true;
      }
      const points = (hand === WESTHAND) ? rowObj.west[field] : rowObj.east[field];

      if (mode === MODE_AT_MOST) {
        ok = points <= count;
      } else if (mode === MODE_AT_LEAST) {
        ok = points >= count;
      } else if (mode === MODE_EXACTLY) {
        ok = points === count;
      } else {
        if (DEBUG) console.log('allowedPoints called with unsupported mode ' + mode);
        return true;
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
        return (el === '') || rowWestArr.includes(el);
      });
      const eastCardsOK = eastArr.every(function(el) {
        return (el === '') || rowEastArr.includes(el);
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
      if (href?.endsWith("mocha.css")) {
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

// let stateObj = { 
// missingCards:'K, 9, 3, 2',
// dist:{check:false, mode:MODE_AT_MOST, count:3}, 
// points:{check:false, hand:WESTHAND, mode:MODE_AT_LEAST, count:3},
// cards:{check:false, west:'', east:''} };
