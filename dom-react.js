// scope: requires react-with-addons (either production or dev)

// react transition setuper
// REQUIREMENTS:
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

///// InputNumber
var InputNumber = React.createClass({
  displayName: 'InputNumber',
  getInitialState() {
    let { defaultValue=0 } = this.props; // link653222
    console.log('defaultValue:', defaultValue);
    return {
      value: defaultValue,
      dragging: false
    }
  },
  onWheel(e) {
    this.crementBy(e.deltaY < 0 ? 0 : -0);
    e.stopPropagation();
    e.preventDefault();
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
    console.error('stopping timedCrement');
    if ('timer' in this) {
      clearTimeout(this.timer);
      console.error('stopped');
      delete this.timer;
      delete this.timerstep;
    }
  },
  crementBy(by) {
    // passed to component
    // change value by, can be positive or negative
    // pass -0 for -crement or just 0 for crement OR for auto correction from isNaN or isMinish or isMaxish
    let { value } = this.state;
    let { crement=1, min, max } = this.props; // link266622
    // if (isTestValid(value)) return false; // TODO: validation here?

    if (by === 0) {
      by = 1/by === -Infinity ? -crement : crement;
      if (isNaN(value)) {
        if (by === -crement) {
          return this.crementTo(min !== undefined ? min : 0)
        } else { // it is === crement
          return this.crementTo(max !== undefined ? max : 0)
        }
      } else if (this.isUnderMin()) { // means it has a min
        return this.crementTo(min);
      } else if (this.isOverMax()) { // means it has a max
        return this.crementTo(max);
      }
    }

    let newvalue = parseInt(value) + by;
    if (this.isTestValid(newvalue))
      this.setState({ value:newvalue });
  },
  crementTo(to) {
    // passed to component
    // set value to
    let newvalue = parseInt(to);
    this.setState({ value:newvalue });
  },
  isTestValid(str) {
    if (typeof(str) == 'number') str = str + '';
    // if (!str.length) { console.log('no length'); return false; }
    // if (isNaN(str)) { console.log('str nan'); return false; }
    // if (!str.trim().length) { console.log('str trim no len'); return false; }
    // let num = parseInt(str);
    // let { min, max } = this;
    // if (min !== undefined && num < min) { console.log('less then min'); return false; }
    // if (max !== undefined && num > max) { console.log('more then max'); return false; }
    if (!str.length) return false;
    if (isNaN(str)) return false;
    if (!str.trim().length) return false;
    let num = parseInt(str);
    let { min, max } = this.props;
    if (min !== undefined && num < min) return false;
    if (max !== undefined && num > max) return false;
    return true;
  },
  isValid() {
    let { value } = this.state;
    console.log('tested validity of value:', value, this.isTestValid(value));
    return this.isTestValid(value);
  },
  isMinish() {
    let { value } = this.state;
    let { min } = this.props;
    if (min === undefined) return false;
    if (isNaN(value)) return false;
    return parseInt(value) <= min ? true : false;
    // if (!this.isTestValid(value)) return false;
  },
  isUnderMin() {
    let { value } = this.state;
    let { min } = this.props;
    if (min === undefined) return false;
    if (isNaN(value)) return false;
    return parseInt(value) < min ? true : false;
    // if (!this.isTestValid(value)) return false;
  },
  isMaxish() {
    let { value } = this.state;
    let { max } = this.props;
    if (max === undefined) return false;
    if (isNaN(value)) return false;
    return parseInt(value) >= max ? true : false;
    // if (!this.isTestValid(value)) return false;
  },
  isOverMax() {
    let { value } = this.state;
    let { max } = this.props;
    if (max === undefined) return false;
    if (isNaN(value)) return false;
    return parseInt(value) > max ? true : false;
    // if (!this.isTestValid(value)) return false;
  },
  componentWillUpdate(nextProps, nextState) {
    let { dispatcher } = this.props;
    let { value } = this.state;
    let { value:newvalue } = nextState;
    if (this.isTestValid(newvalue) && parseInt(value) !== parseInt(newvalue)) {
      if (dispatcher) dispatcher(parseInt(newvalue));
    }
  },
  render() {
    let {
      component, // REQUIRED either just an input, with optionally a label and/or container
      // crement=1, // used at link266622 // size of increment/decrement
      sensitivty=10, // min:1, pixels mouse should move before crementing
      cursor='ew-resize', // cursor when mouse dragging can crementing
      min, // optional. min value
      max, // optinal. max value
      dispatcher, // optional - redux only - a function that takes one argument, like: `newval => store.dispatch(actionCreator(newval))`
      // defaultValue=0, used at link653222
      ...other // what the devuser wants to pass to the component
    } = this.props;
    // validation and mouseable always happens - but if no element to attach the mousedrag too then nothing happens. can set multiple elements as target for mousedrag
    let { value } = this.state;

    if (!('maxlen' in this)) this.maxlen = max !== undefined ? max.toString().length : undefined;

    let domprops_text = {
      value,
      onChange: this.onTextChange,
      onKeyDown: this.onTextKeyDown,
      maxLength: this.maxlen,
      onWheel: this.onWheel
    };
    let domprops_mouseable = { style:{cursor}, onWheel:this.onWheel };

    let isvalid = this.isValid();
    let isminish = this.isMinish();
    let ismaxish = this.isMaxish();
    // component should set `wheelable#` `draggable#` or `allable#` - the input element will by default be wheelable
    return React.createElement(component, { ref:'component', ...other, crementBy:this.crementBy, crementTo:this.crementTo, timedCrement:this.timedCrement, timedCrementStop:this.timedCrementStop, isvalid, ismaxish, isminish, domprops_text, domprops_mouseable });
  }
});
