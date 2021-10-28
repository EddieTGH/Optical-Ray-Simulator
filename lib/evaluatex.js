/**
 * Parses a given math expression and returns a function that computes the result.
 * @param {String} expression Math expression to parse.
 * @param {Object} constants A map of constants that will be compiled into the resulting function.
 * @param {Object} options Options to Evaluatex.
 * @returns {fn} A function that takes an optional map of variables. When invoked, this function computes the math expression and returns the result. The function has fields `ast` and `expression`, which respectively hold the AST and original math expression.
 */
 function evaluatex(expression, constants = {}, options = {}) {
    const tokens = lexer(expression, constants, options);
    const ast = parser(tokens).simplify();
    const fn = function(variables = {}) { return ast.evaluate(variables); };
    fn.ast = ast;
    fn.expression = expression;
    fn.tokens = tokens;
    return fn;
}

// List of arities for LaTeX commands. Since LaTeX command arguments aren't delimited by parens, we'll cheat a bit and provide a bit of context to the parser about how to parse each command.

/**
 * List of arities for LaTeX commands. Arguments for LaTeX commands aren't delimited by parens, so the compiler needs to know how many arguments to expect for each function.
 */
 var arities = {
    "frac": 2,
    "sqrt": 1,
    "sin": 1,
    "cos": 1,
    "tan": 1,
    "arcsin": 1,
    "arccos": 1,
    "arctan": 1,
    "sec": 1,
    "csc": 1,
    "cot": 1,
    "arcsec": 1,
    "arccsc": 1,
    "arccot": 1,
    "log": 1,
    "ln": 1, 
};

class Token {
    constructor(type, value = "") {
        this.type = type;
        this.value = value;
        this.name = null; // Used in function and command tokens to retain the fn name when minified
    }

    equals(token) {
        return this.type === token.type &&
            this.value === token.value;
    }

    toString() {
        if (TRIVIAL_TOKENS.indexOf(this.type) >= 0) {
            return this.type;
        }

        const val = typeof this.value === "function" ? this.name : this.value;

        return `${ this.type }[${ val }]`;
    }

    static TYPE_LPAREN = "LPAREN";
    static TYPE_RPAREN = "RPAREN";
    static TYPE_PLUS = "PLUS";
    static TYPE_MINUS = "MINUS";
    static TYPE_TIMES = "TIMES";
    static TYPE_DIVIDE = "DIVIDE";
    static TYPE_COMMAND = "COMMAND";
    static TYPE_SYMBOL = "SYMBOL";
    static TYPE_WHITESPACE = "WHITESPACE";
    static TYPE_ABS = "ABSOLUTEVAL";
    static TYPE_BANG = "BANG";
    static TYPE_COMMA = "COMMA";
    static TYPE_POWER = "POWER";
    static TYPE_NUMBER = "NUMBER";

    static patterns = new Map([
        [Token.TYPE_LPAREN, /(\(|\[|{|\\left\(|\\left\[)/], // Match (, [, {, \left(, \left[
        [Token.TYPE_RPAREN, /(\)|]|}|\\right\)|\\right])/], // Match ), ], }, \right), \right]
        [Token.TYPE_PLUS, /\+/],
        [Token.TYPE_MINUS, /-/],
        [Token.TYPE_TIMES, /(\*|\\cdot)/],
        [Token.TYPE_DIVIDE, /\//],
        [Token.TYPE_COMMAND, /\\[A-Za-z]+/],
        [Token.TYPE_SYMBOL, /[A-Za-z_][A-Za-z_0-9]*/],
        [Token.TYPE_WHITESPACE, /\s+/], // Whitespace
        [Token.TYPE_ABS, /\|/],
        [Token.TYPE_BANG, /!/],
        [Token.TYPE_COMMA, /,/],
        [Token.TYPE_POWER, /\^/],
        [Token.TYPE_NUMBER, /\d+(\.\d+)?/]
    ]);
};

/**
 * Trivial tokens are those that can only have a single value, so printing their value is unnecessary.
 */
const TRIVIAL_TOKENS = ["TPLUS", "TMINUS", "TTIMES", "TDIVIDE", "TWS", "TABS", "TBANG", "TCOMMA", "TPOWER"];

/*
Javascript's Math API omits some important mathematical functions. These are included here.
 */

// Single-arg tokens are those that, when in LaTeX mode, read only one character as their argument OR a block delimited by { }. For example, `x ^ 24` would be read as `SYMBOL(x) POWER NUMBER(2) NUMBER(4).
const CHAR_ARG_TOKENS = [Token.TYPE_POWER, Token.TYPE_COMMAND];

const DEFAULT_OPTS = {
    latex: false
};

/**
 * The lexer reads a math expression and breaks it down into easily-digestible Tokens.
 * A list of valid tokens can be found lower in this file.
 * @param equation (String) The equation to lex.
 * @param constants (Object) An object of functions and variables.
 * @param opts Options.
 * @returns {Array} An array of Tokens.
 */
function lexer(equation, constants = {}, opts = DEFAULT_OPTS) {
    let l = new Lexer(equation, constants, opts);
    l.lex();

    // toString() each token and concatenate into a big string. Useful for debugging.
    l.tokens.toString = () => l.tokens.map(token => token.toString()).join(" ");

    return l.tokens;
}

class Lexer {
    constructor(buffer, constants, opts) {
        this.buffer = buffer;
        this.constants = Object.assign({}, constants, locals);
        this.opts = opts;
        this.tokens = [];
    }

    lex() {
        this.lexExpression();
        this.replaceConstants();
        this.replaceCommands();
    }

    /**
     * Lexes an expression or sub-expression.
     */
    lexExpression(charMode = false) {
        while (this.hasNext()) {
            let token = charMode ? this.nextCharToken() : this.next();
            this.tokens.push(token);

            if (this.opts.latex && isCharArgToken(token)) {
                let arity = 1;
                if (token.type === Token.TYPE_COMMAND) {
                    arity = arities[token.value.substr(1).toLowerCase()];
                }
                for (let i = 0; i < arity; i++) {
                    this.lexExpression(true);
                }
            }
            else if (isStartGroupToken(token)) {
                this.lexExpression(false);
            }

            if (charMode || isEndGroupToken(token)) {
                return;
            }
        }
    }

    hasNext() {
        return this.buffer.length > 0;
    }

    /**
     * Retrieves the next non-whitespace token from the buffer.
     * @param len
     * @returns {Token}
     */
    next(len = undefined) {
        this.skipWhitespace();

        if (!this.hasNext()) {
            throw "Lexer error: reached end of stream";
        }

        // Try to match each pattern in tokenPatterns to the remaining buffer
        for (const [type, regex] of Token.patterns) {
            // Force the regex to match only at the beginning of the string
            const regexFromStart = new RegExp(/^/.source + regex.source);

            // When `len` is undefined, substr reads to the end
            let match = regexFromStart.exec(this.buffer.substr(0, len));
            if (match) {
                this.buffer = this.buffer.substr(match[0].length);
                return new Token(type, match[0]);
            }
        }

        // TODO: Meaningful error
        throw "Lexer error: can't match any token";
    }

    /**
     * Tokenizes the next single character of the buffer, unless the following token is a LaTeX command, in which case the entire command is tokenized.
     */
    nextCharToken() {
        this.skipWhitespace();
        if (this.buffer.charAt(0) === "\\") {
            return this.next();
        }
        return this.next(1);
    }

    replaceCommands() {
        for (const token of this.tokens) {
            if (token.type === Token.TYPE_COMMAND) {
                token.value = token.value.substr(1).toLowerCase();
                token.name = token.value; // Save name of function for debugging later
                token.value = this.constants[token.name];
            }
        }
    }

    replaceConstants() {
        for (const token of this.tokens) {
            if (token.type === Token.TYPE_SYMBOL) {
                // Symbols will need to be looked up during the evaluation phase.
                // If the symbol refers to things defined in either Math or
                // the locals, compile them, to prevent slow lookups later.
                if (typeof this.constants[token.value] === "function") {
                    token.type = Token.TYPE_FUNCTION;
                    token.name = token.value; // Save name of function for debugging later
                    token.value = this.constants[token.value];
                }
                else if (typeof this.constants[token.value] === "number") {
                    token.type = Token.TYPE_NUMBER;
                    token.value = token.fn = this.constants[token.value];
                }
            }
        }
    }

    /**
     * Removes whitespace from the beginning of the buffer.
     */
    skipWhitespace() {
        const regex = new RegExp(/^/.source + Token.patterns.get(Token.TYPE_WHITESPACE).source);
        this.buffer = this.buffer.replace(regex, "");
    }
}

function isCharArgToken(token) {
    return CHAR_ARG_TOKENS.indexOf(token.type) !== -1;
}

function isStartGroupToken(token) {
    return token.type === Token.TYPE_LPAREN && token.value === "{";
}

function isEndGroupToken(token) {
    return token.type === Token.TYPE_RPAREN && token.value === "}";
}

// Parser
// ======

// The parser takes a list of Token objects and tries to construct a syntax
// tree that represents the math to be evaluated, taking into account the
// correct order of operations.
// This is a simple recursive-descent parser based on [Wikipedia's example](https://en.wikipedia.org/wiki/Recursive_descent_parser).

function parser(tokens) {
    let p = new Parser(tokens);
    return p.parse();
};

class Parser {
    constructor(tokens = []) {
        this.cursor = 0;
        this.tokens = tokens;
    }

    get currentToken() {
        return this.tokens[this.cursor];
    }

    get prevToken() {
        return this.tokens[this.cursor - 1];
    }

    parse() {
        //this.preprocess();
        let ast = this.sum();
        ast = ast.simplify();

        // Throw an exception if there are still tokens remaining after parsing
        if (this.currentToken !== undefined) {
            console.log(ast.printTree());
            throw "Parsing error: Expected end of input, but got " + this.currentToken.type +
            " " + this.currentToken.value;
        }

        return ast;
    }

    //preprocess() {
    // This function used to contain procedures to remove whitespace
    // tokens and replace symbol tokens with functions, but that work
    // has been moved to the lexer in order to keep the parser more
    // lightweight.
    //}

    /**
     * Accepts the current token if it matches the given type.
     * If it does, the cursor is incremented and this method returns true.
     * If it doesn't, the cursor stays where it is and this method returns false.
     * @param type Type of token to accept.
     * @returns {boolean} True if the token was accepted.
     */
    accept(type) {
        if (this.currentToken && this.currentToken.type === type) {
            this.cursor++;
            return true;
        }
        return false;
    }

    /**
     * Accepts the current token if it matches the given type.
     * If it does, the cursor is incremented.
     * If it doesn't, an exception is raised.
     * @param type
     */
    expect(type) {
        if (!this.accept(type)) {
            throw "Expected " + type + " but got " +
            (this.currentToken ? this.currentToken.toString() : "end of input.");
        }
    }

    // Rules
    // -----

    /**
     * Parses a math expression with
     */
    sum() {
        let node = new Node(Node.TYPE_SUM);
        node.addChild(this.product());

        while (true) {
            // Continue to accept chained addends
            if (this.accept(Token.TYPE_PLUS)) {
                node.addChild(this.product());
            }
            else if (this.accept(Token.TYPE_MINUS)) {
                node.addChild(new Node(Node.TYPE_NEGATE).addChild(this.product()));
            }
            else {
                break;
            }
        }

        return node;
    }

    product() {
        let node = new Node(Node.TYPE_PRODUCT);
        node.addChild(this.power());

        while (true) {
            // Continue to accept chained multiplicands

            if (this.accept(Token.TYPE_TIMES)) {
                node.addChild(this.power());
            }
            else if (this.accept(Token.TYPE_DIVIDE)) {
                node.addChild(new Node(Node.TYPE_INVERSE).addChild(this.power()));
            }
            else if (this.accept(Token.TYPE_LPAREN)) {
                this.cursor--;
                node.addChild(this.power());
            }
            else if (this.accept(Token.TYPE_SYMBOL) ||
                this.accept(Token.TYPE_NUMBER) ||
                this.accept(Token.TYPE_FUNCTION) ||
                this.accept(Token.TYPE_COMMAND)) {
                this.cursor--;
                node.addChild(this.power());
            }
            else {
                break;
            }
        }

        return node;
    }

    power() {
        let node = new Node(Node.TYPE_POWER);
        node.addChild(this.val());

        // If a chained power is encountered (e.g. a ^ b ^ c), treat it like
        // a ^ (b ^ c)
        if (this.accept(Token.TYPE_POWER)) {
            node.addChild(this.power());
        }

        return node;
    }

    val() {
        // Don't create a new node immediately, since we need to parse postfix
        // operators like factorials, which come after a value.
        let node = {};

        if (this.accept(Token.TYPE_SYMBOL)) {
            node = new Node(Node.TYPE_SYMBOL, this.prevToken.value);
        }
        else if (this.accept(Token.TYPE_NUMBER)) {
            node = new Node(Node.TYPE_NUMBER, parseFloat(this.prevToken.value));
        }
        else if (this.accept(Token.TYPE_COMMAND)) {
            const cmdToken = this.prevToken;
            node = new Node(Node.TYPE_FUNCTION, cmdToken.value);
            node.name = cmdToken.name;

            for (let i = 0; i < arities[cmdToken.name]; i++) {
                node.addChild(this.val());
            }
        }
        else if (this.accept(Token.TYPE_FUNCTION)) {
            node = new Node(Node.TYPE_FUNCTION, this.prevToken.value);
            node.name = this.prevToken.name;

            // Multi-param functions require parens and have commas
            if (this.accept(Token.TYPE_LPAREN)) {
                node.addChild(this.sum());

                while (this.accept(Token.TYPE_COMMA)) {
                    node.addChild(this.sum());
                }

                this.expect(Token.TYPE_RPAREN);
            }

            // Single-parameter functions don't need parens
            else {
                node.addChild(this.power());
            }
        }
        else if (this.accept(Token.TYPE_MINUS)) {
            node = new Node(Node.TYPE_NEGATE).addChild(this.power());
        }
        else if (this.accept(Token.TYPE_LPAREN)) {
            node = this.sum();
            this.expect(Token.TYPE_RPAREN);
        }
        else if (this.accept(Token.TYPE_ABS)) {
            node = new Node(Node.TYPE_FUNCTION, Math.abs);
            node.addChild(this.sum());
            this.expect(Token.TYPE_ABS);
        }
        else {
            throw "Unexpected " + this.currentToken.toString() + " at token " + this.cursor;
        }

        if (this.accept(Token.TYPE_BANG)) {
            let factNode = new Node(Node.TYPE_FUNCTION, fact);
            factNode.addChild(node);
            return factNode;
        }

        return node;
    }
}

/*
// Non-terminal rules
// ------------------

// The following parser functions match certain motifs that are called
// "non-terminals" in parsing lingo.
// Essentially, they implement a sort of finite state automaton.
// You should read the [Wikipedia article](https://en.wikipedia.org/wiki/Recursive_descent_parser) on recursive-descent parsing if you want to know more about how these work.

// ### Grammar:
// ```
// orderExpression : sum
// sum : product { ('+'|'-') product }
// product : power { ('*'|'/') power }
//         | power '(' orderExpression ')'
// power : TODO power
// val : SYMBOL
//     | NUMBER
//     | FUNCTION '(' orderExpression { ',' orderExpression } ')'
//     | '-' val
//     | '(' orderExpression ')'
//     | '{' orderExpression '}'
//     | '|' orderExpression '|'
//     | val '!'
// ```
*/

// Parses values or nested expressions.
//Parser.prototype.val = function() {
// Don't return new nodes immediately, since we need to parse
// factorials, which come at the END of values.
//var node = {};


// Parse negative values like -42.
// The lexer can't differentiate between a difference and a negative,
// so that distinction is done here.
// Notice the `power()` rule that comes after a negative sign so that
// expressions like `-4^2` return -16 instead of 16.


// Parse nested expression with parentheses.
// Notice that the parser expects an RPAREN token after the expression.


// Parse absolute value.
// Absolute values are contained in pipes (`|`) and are treated quite
// like parens.


// All parsing rules should have terminated or recursed by now.
// Throw an exception if this is not the case.


// Process postfix operations like factorials.

// Parse factorial.


//return node;
//};
/**
 * Node represents a node in an abstract syntax tree. Nodes have the following properties:
 *  - A type, which determines how it is evaluated;
 *  - A value, such as a number or function; and
 *  - An ordered list of children.
 */
class Node {
    constructor(type, value = "") {
        this.type = type;
        this.value = value;
        this.name = null; // Used in function and command nodes to retain the fn name when minified
        this.children = [];
    }

    /**
     * Adds a node to the list of children and returns this Node.
     * @param node Child node to addChild.
     * @returns {Node} This node.
     */
    addChild(node) {
        this.children.push(node);
        return this;
    }

    /**
     * Returns this Node's first child.
     */
    get child() {
        return this.children[0];
    }

    /**
     * Evaluates this Node and all child nodes recursively, returning the numerical result of this Node.
     */
    evaluate(vars) {
        let result = 0;

        switch (this.type) {
            case Node.TYPE_FUNCTION:
                const evaluatedChildren = this.children.map(childNode => childNode.evaluate(vars));
                result = this.value.apply(this, evaluatedChildren);
                break;
            case Node.TYPE_INVERSE:
                result = 1.0 / this.child.evaluate(vars);
                break;
            case Node.TYPE_NEGATE:
                result = -this.child.evaluate(vars);
                break;
            case Node.TYPE_NUMBER:
                result = this.value;
                break;
            case Node.TYPE_POWER:
                result = Math.pow(
                    this.children[0].evaluate(vars),
                    this.children[1].evaluate(vars)
                );
                break;
            case Node.TYPE_PRODUCT:
                result = this.children.reduce((product, child) => product * child.evaluate(vars), 1);
                break;
            case Node.TYPE_SUM:
                result = this.children.reduce((sum, child) => sum + child.evaluate(vars), 0);
                break;
            case Node.TYPE_SYMBOL:
                if (isFinite(vars[this.value])) {
                    return vars[this.value];
                }
                throw "Symbol " + this.value + " is undefined or not a number";
        }

        return result;
    }

    /**
     * Determines whether this Node is unary, i.e., whether it can have only one child.
     * @returns {boolean}
     */
    isUnary() {
        return UNARY_NODES.indexOf(this.type) >= 0;
    }

    get nodeCount() {
        let count = 1;
        for (let i of this.children) {
            count += i.nodeCount;
        }
        return count;
    }

    /**
     * Prints a tree-like representation of this Node and all child Nodes to the console.
     * Useful for debugging parser problems.
     * If printTree() is called on the root node, it prints the whole AST!
     * @param level (Integer, Optional) Initial level of indentation. You shouldn't need to use this.
     */
    printTree(level = 0) {
        // Generate the indent string from the current `level`.
        // Child nodes will have a greater `level` and will appear indented.
        let indent = "";
        let indentString = "  ";
        for (let i = 0; i < level; i++) {
            indent += indentString;
        }

        console.log(indent + this.toString());

        // Print each child.
        for (let i in this.children) {
            this.children[i].printTree(level + 1);
        }
    }

    simplify() {
        if (this.children.length > 1 || this.isUnary()) {
            // Node can't be simplified.
            // Clone this Node and simplify its children.
            let newNode = new Node(this.type, this.value);
            for (let i in this.children) {
                newNode.addChild(this.children[i].simplify());
            }
            return newNode;
        }
        else if (this.children.length === 1) {
            // A non-unary node with no children has no function.
            return this.children[0].simplify();
        }
        else {
            // A node with no children is a terminal.
            return this;
        }
    }

    toString() {
        const val = typeof this.value === "function" ? this.name : this.value;
        return `${ this.children.length } ${ this.type } [${ val }]`;
    }

    static TYPE_FUNCTION = "FUNCTION";
    static TYPE_INVERSE = "INVERSE";
    static TYPE_NEGATE = "NEGATE";
    static TYPE_NUMBER = "NUMBER";
    static TYPE_POWER = "POWER";
    static TYPE_PRODUCT = "PRODUCT";
    static TYPE_SUM = "SUM";
    static TYPE_SYMBOL = "SYMBOL";
}

const UNARY_NODES = ["FACTORIAL", "FUNCTION", "INVERSE", "NEGATE"];

/**
 * Token represents a lexical token. It has a type and a value.
 * @param type (String) Token type. A list of types is found in "utils/tokens.js".
 * @param value Value of the token.
 */

const fact = function fact(a) {
    a = Math.round(a);
    let result = 1;

    if (a < 0) {
        throw "Can't factorial a negative.";
    }

    for (a; a > 1; a--) {
        result *= a;
    }
    return result;
};

const frac = function frac(a, b) {
    return a / b;
};

const logn = function logn(x, b) {
    return Math.log(x) / Math.log(b);
};

const rootn = function rootn(x, n) {
    return Math.pow(x, 1 / n);
};

const sec = function src(x) {
    return 1 / Math.cos(x);
};

const csc = function csc(x) {
    return 1 / Math.sin(x);
};

const cot = function cot(x) {
    return 1 / Math.tan(x);
};

const locals = { fact, frac, logn, rootn, sec, csc, cot };

// Copy things from Math. Can't use Object.assign since Math has non-enumerable properties.
for (const k of Object.getOwnPropertyNames(Math)) {
    locals[k] = Math[k];
}
