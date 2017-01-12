// scope: requires react-with-addons (either production or dev)

// REQUIREMENTS:
// dom.js - stopClickAndCheck0
// var gTrans = [] setup on your side. `var` so i can access from here (dom-react.js)
const ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;
function createTrans(transitionName, transitionEnterTimeout, transitionLeaveTimeout, transitionAppear=undefined) {
	// transitionAppear is true else undefined
	let props = { transitionName, transitionEnterTimeout, transitionLeaveTimeout };
	if (transitionAppear) {
		props.transitionAppear = true;
		props.transitionAppearTimeout = transitionEnterTimeout;
	}
	if (transitionEnterTimeout === 0) {
		props.transitionEnter = false;
		delete props.transitionEnterTimeout;
	}
	if (transitionLeaveTimeout === 0) {
		props.transitionLeave = false;
		delete props.transitionLeaveTimeout;
	}
	return props;
}

function getTrans(transitionName, otherProps={}) {
	// use this in the React.createElement(ReactCSSTransitionGroup, getTrans(...))
	for (let trans of gTrans) {
		if (trans.transitionName == transitionName) {
			if (otherProps) {
				return {...trans, ...otherProps};
			} else {
				return trans;
			}
		}
	}
}
function initTransTimingStylesheet() {
	let style = document.createElement('style');
	let rules = [];
	for (let trans of gTrans) {
		let { transitionName, transitionEnterTimeout, transitionLeaveTimeout, transitionAppear } = trans;
		if (transitionAppear) {
			rules.push('.' + transitionName + '-appear.' + transitionName + '-appear-active,');
		}
		rules.push('.' + transitionName + '-enter.' + transitionName + '-enter-active { transition-duration:' + transitionEnterTimeout + 'ms }');
		rules.push('.' + transitionName + '-leave.' + transitionName + '-leave-active { transition-duration:' + transitionLeaveTimeout + 'ms }');
	}
	style.textContent = rules.join('');
	document.head.appendChild(style);
}

// REQUIREMENTS
// dom.js - stopClickAndCheck0
var InputNumber = React.createClass({
  displayName: 'InputNumber',
  getInitialState() {
    let { defaultValue=0 } = this.props; // link653222
    console.log('defaultValue:', defaultValue);
    return {
      value: defaultValue,
      dragging: 0 // 0-not dragging 1-dragging allow -1-dragging not allow
    }
  },
  onWheel(e) {
    let { deltaX:x, deltaY:y, deltaZ:z } = e;
    // console.log('wheel delta', 'x:', x, 'y:', y, 'z:', z);

    if (y) this.crementBy(y < 0 ? 0 : -0); // up/dn = increment/decrement
    else if (x) this.crementBy(x > 0 ? 0 : -0); // right/left = increment/decrement
    else this.crementBy(z < 0 ? 0 : -0); // guess

    e.stopPropagation();
    e.preventDefault();
  },
  onDragStart(e) {
    // to be attached to onMouseDown
    if (!stopClickAndCheck0(e)) return;

    let { value, dragging } = this.state;
    let { dragdir='vertical' } = this.props; // link34666
    if (dragging) return; // already dragging, this should never happen
    // TODO: check if it is a valid number? and return if not? this is what i did in my first version of InputNumber
    let dimension = dragdir == 'vertical' ? 'clientY' : 'clientX';
    this.drginfo = {
      value_st: value,
      dimension,
      position_st: e[dimension],
      firstdrag: true
    };
    console.log('setting into drag, drginfo:', this.drginfo);
    this.setState({dragging:1}); // TODO: even if invalid value, dragging will set it to min or max
  },
  onDragStop(e) {
    console.log('stopping drag');
    this.setState({dragging:0});
    delete this.drginfo;
  },
  onDrag(e) {
    let { dimension, position_st, value_st, firstdrag } = this.drginfo;
    let { sensitivty=10, crement=1, max, min } = this.props; // link199288 link266622
    let { value, dragging } = this.state;
    let position_delta = dimension.endsWith('Y') ? position_st - e[dimension] : e[dimension] - position_st; // so up/dn means increment/decrement and right/left means increment/decrement
    let value_delta = Math.round(position_delta / sensitivty) * crement;
    // console.log('position_delta:', position_delta, 'value_delta:', value_delta);

    if (firstdrag) {
      delete this.drginfo.firstdrag;

      if (isNaN(value_st) || !value_st.trim().length) {
        console.warn('position_delta:', position_delta);
        // null recovery triple if is link848477
        if (position_delta > 0) {
          // going up, so start at min
          if (min !== undefined) value_st = min;
          else if (max !== undefined) value_st = max;
          else value_st = 0;
        } else {
          // user going down, so start at max
          if (max !== undefined) value_st = max;
          else if (min !== undefined) value_st = min;
          else value_st = 0;
        }

        this.drginfo.value_st = value_st;

        this.setState({
          // dragging: 1, // no need for this as firstdrag starts at 1
          value: value_st
        });

        return;
      }
    }

    let newvalue = value_st + value_delta;

    let newdragging = 1;
    if (this.isOverMax(newvalue)) {
      newdragging = -1;
      newvalue = max;
    }
    if (this.isUnderMin(newvalue)) {
      newdragging = -1;
      newvalue = min;
    }

    // console.log('value vs newvalue', value, newvalue);
    if (value !== newvalue || dragging !== newdragging) {
      // this.crementTo(newvalue); // i dont use crementTo because i have to set dragging at the same time
      this.setState({
        dragging: newdragging,
        value: newvalue
      });
    }
  },
  onTextChange(e) {
    this.setState({ value:e.target.value });
  },
  onTextKeyDown(e) {
    // let { key, preventDefault, stopPropagation } = e;
    let { key, ctrlKey, altKey, metaKey } = e;
    if (key.length === 1 && !ctrlKey && !altKey && !metaKey) {
      if (!['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(key)) {
        console.log('blocking key:', key);
        e.preventDefault();
        // e.stopPropagation();
      }
    } else {
      switch (key) {
        case 'ArrowUp':
            this.crementBy(0);
          break;
        case 'ArrowDown':
            this.crementBy(-0);
          break;
      }
    }
  },
  timerintvl_max: 500,
  timerintvl_min: 30,
  timedCrement(by) {
    // aka timedCrementStart
    if (!('timer' in this)) {
      // first call
      this.timerstep = 0;
    }
    this.crementBy(by);
    this.timerstep++;
    this.timer = setTimeout(()=>this.timedCrement(by), Math.max(this.timerintvl_max / (2 * this.timerstep), this.timerintvl_min));
  },
  timedCrementStop() {
    if ('timer' in this) {
      clearTimeout(this.timer);
      delete this.timer;
      delete this.timerstep;
    }
  },
  crementBy(by) {
    // passed to component
    // change value by, can be positive or negative
    // pass -0 for -crement or just 0 for crement OR for auto correction from isNaN or isMinish or isMaxish
    // passing 0 to `by` is special, as it will respect min/max if it has it
    let { value } = this.state;
    let { crement=1, min, max } = this.props; // link266622

    value = this.getNumber(value);

    let by_orig = by;
    if (by === 0) {
      by = 1/by === -Infinity ? -crement : crement;
      if (value === null) {
        // null recovery triple if is link848477
        if (by === -crement) {
          if (max !== undefined) return this.crementTo(max);
          else if (min !== undefined) return this.crementTo(min);
          else return this.crementTo(0);
        } else { // it is === crement
          if (min !== undefined) return this.crementTo(min);
          else if (max !== undefined) return this.crementTo(max);
          else return this.crementTo(0);
        }
      } else if (this.isUnderMin()) { // means it has a min
        return this.crementTo(min);
      } else if (this.isOverMax()) { // means it has a max
        return this.crementTo(max);
      }
    } else if (value === null) {
      // as it is not a number, i cant do any math on it
      return;
    }

    let newvalue = value + by;

    if (by_orig === 0 && this.isInvalid(newvalue)) return; // only if by_orig was 0/-0, this is special validation check as i think thats what devuser would expect for auto handling, test if is within min/max as we know for sure it is a number already due to checks above

    this.setState({ value:newvalue });
  },
  crementTo(to) {
    // passed to component
    // set value to
    let newvalue = this.getNumber(to);
    this.setState({ value:newvalue });
  },
  getNumber(val) {
    // returns number or null
    // val should be string or number
    // does not support negative or decimal
    if (typeof(val) == 'string') {
      if (!val.trim().length) return null;
      val = /-?\d+/.exec(val);
      // can consider doing just `val = parseInt(val)`
      if (!val) return null;
    } else if (val === null) {
      return null;
    }
    if (isNaN(val)) return null;
    // isNaN(null) is false - so if i dont do the val === null check above, parseInt(NaN) returns NaN
    return parseInt(val);
  },
  isInvalid(val=this.state.value) {
    // returns null if `isvalid` string;enum[IS_BLANK,NOT_NUMBER, RANGE_UNDER_MIN, RANGE_OVER_MAX]

    const NOT_NUMBER = 'NOT_NUMBER';
    const IS_BLANK = 'IS_BLANK';
    const RANGE_UNDER_MIN = 'RANGE_UNDER_MIN';
    const RANGE_OVER_MAX = 'RANGE_OVER_MAX';

    window.isInvalid = this.isInvalid;
    console.log('isInvalid testing val:', '"' + val + '"');

    if (typeof(val) == 'string' && !val.trim().length) return IS_BLANK;

    val = this.getNumber(val);
    if (val === null) return NOT_NUMBER;

    let { min, max } = this.props;
    if (min !== undefined && val < min) return RANGE_UNDER_MIN;
    if (max !== undefined && val > max) return RANGE_OVER_MAX;

    return null;
  },
  isMinish(val=this.state.value) {
    // returns bool
    let { min } = this.props;
    if (min === undefined) return false;
    val = this.getNumber(val);
    if (val === null) return false;
    return val <= min ? true : false;
  },
  isUnderMin(val=this.state.value) {
    // returns bool
    let { min } = this.props;
    if (min === undefined) return false;
    val = this.getNumber(val);
    if (val === null) return false;
    return val < min ? true : false;
  },
  isMaxish(val=this.state.value) {
    // returns bool
    let { max } = this.props;
    if (max === undefined) return false;
    val = this.getNumber(val);
    if (val === null) return false;
    return val >= max ? true : false;
  },
  isOverMax(val=this.state.value) {
    // returns bool
    let { max } = this.props;
    if (max === undefined) return false;
    val = this.getNumber(val);
    if (val === null) return false;
    return val > max ? true : false;
  },
  componentWillUpdate(nextProps, nextState) {
    let { dispatcher } = this.props;
    let { value } = this.state;
    let { value:newvalue } = nextState;
    newvalue = this.getNumber(newvalue);
    value = this.getNumber(value);
    if (!this.isInvalid(newvalue) && value !== newvalue) {
      console.log('dispatching newvalue of:', newvalue, 'because isInvalid:', this.isInvalid(newvalue), 'getNumber(null):', this.getNumber(null));
      if (dispatcher) dispatcher(newvalue);
    }
  },
  render() {
    let {
      component, // REQUIRED either just an input, with optionally a label and/or container
      // crement=1, // used at link266622 // size of increment/decrement
      // sensitivty=10, // used at link199288 // min:1, pixels mouse should move before crementing
      dragdir='vertical', // default also used at link34666 // cursor when mouse dragging can crementing
      min, // optional. min value
      max, // optinal. max value
      dispatcher, // optional - redux only - a function that takes one argument, like: `newval => store.dispatch(actionCreator(newval))`
      // defaultValue=0, used at link653222
      ...other // what the devuser wants to pass to the component
    } = this.props;
    // validation and mouseable always happens - but if no element to attach the mousedrag too then nothing happens. can set multiple elements as target for mousedrag
    let { value, dragging } = this.state;

    if (!('maxlen' in this)) this.maxlen = max !== undefined ? max.toString().length : undefined;

    let domprops_text = {
      value,
      onChange: this.onTextChange,
      onKeyDown: this.onTextKeyDown,
      maxLength: this.maxlen,
      onWheel: this.onWheel
    };

    let cursor = dragdir == 'vertical' ? 'ns-resize' : 'ew-resize';
    let domprops_mouseable = { style:{cursor}, onWheel:this.onWheel, onMouseDown:this.onDragStart };

    let isinvalid = this.isInvalid();
    let isminish = this.isMinish();
    let ismaxish = this.isMaxish();


    let drag_cursor;
    if (dragging) {
      let { value_dragged } = this.drginfo;
      drag_cursor = dragging === -1 ? 'not-allowed' : cursor;
    }

    // component should set `wheelable#` `draggable#` or `allable#` - the input element will by default be wheelable
    return React.createElement(component, { ...other, crementBy:this.crementBy, crementTo:this.crementTo, timedCrement:this.timedCrement, timedCrementStop:this.timedCrementStop, isinvalid, isminish, ismaxish, domprops_text, domprops_mouseable },
      dragging ? React.createElement('div', { style:{zIndex:'2000', position:'fixed', top:'0', left:'0', width:'100vw', height:'100vh', cursor:drag_cursor}, onMouseUp:this.onDragStop, onMouseMove:this.onDrag }) : undefined // cant do the dragging && oterhwise that will print a 0 to dom // crossfile-link92828222
    );
  }
});

// start - shallow stuff
// REQUIREMENTS
// React.addons
// this shallow compare stuff doesn't really need DOM BUT it does
function shallowCompare(cur, next) {
    return React.addons.shallowCompare({props:cur}, next);
}
// REQUIREMENTS
// none
function makeShallow(obj) {
    // make an object shallow, else return whatever it is
    if (!obj || Object.prototype.toString.call(obj) != '[object Object]') return obj;
    // store deferenceables into an object
    return Object.entries(obj).reduce( (acc, [key, val]) => {
        if (!val || ['number', 'string', 'boolean'].includes(typeof(val))) { // !val means its undefined/null/false/0
            acc[key] = val;
        } else {
            acc[key] = 1; //its a thing that has a reference, so lets break that ref
        }
        return acc;
    }, {});
}
// REQUIREMENTS
// common/all.js
function shallowCompareMulti(curobj, nextobj, ...dotpaths) {
    for (dotpath of dotpaths) {
        let cur = makeShallow(dotpath == '.' ? curobj : deepAccessUsingString(curobj, dotpath));
        let next = makeShallow(dotpath == '.' ? nextobj : deepAccessUsingString(nextobj, dotpath));
        if (shallowCompare(cur, next)) return true;
    }
}
// end - shallow stuff
