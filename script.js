

// Function to update matrix size and regenerate input fields
function updateMatrixSize() {
    const size = parseInt(document.getElementById('matrix-size').value);
    generateMatrix(size);
}

// Function to generate matrix input fields
function generateMatrix(size) {
    const container = document.getElementById('matrix-container');
    container.innerHTML = '';

    for (let i = 0; i < size; i++) {
        const row = document.createElement('div');
        row.className = 'matrix-row';

        // Coefficient inputs
        for (let j = 0; j < size; j++) {
            const cell = document.createElement('div');
            cell.className = 'matrix-cell';
            const input = document.createElement('input');
            input.type = 'number';
            input.step = 'any';
            input.placeholder = `a${i+1}${j+1}`;
            cell.appendChild(input);
            row.appendChild(cell);
        }

        // Constants input (b vector)
        const constCell = document.createElement('div');
        constCell.className = 'matrix-cell';
        const constInput = document.createElement('input');
        constInput.type = 'number';
        constInput.step = 'any';
        constInput.placeholder = `b${i+1}`;
        constCell.appendChild(constInput);
        row.appendChild(constCell);

        container.appendChild(row);
    }
}

// Function to get matrix values from inputs
function getMatrixValues() {
    const size = parseInt(document.getElementById('matrix-size').value);
    const matrix = [];
    const rows = document.querySelectorAll('.matrix-row');

    rows.forEach(row => {
        const inputs = row.querySelectorAll('input');
        const coefficients = Array.from(inputs).slice(0, -1).map(input => parseFloat(input.value || '0'));
        const constant = parseFloat(inputs[inputs.length - 1].value || '0');
        matrix.push([...coefficients, constant]);
    });

    // Display the input matrix in LaTeX
    const inputMatrixDiv = document.getElementById('input-matrix-preview');
    if (inputMatrixDiv) {
        const variables = Array.from({length: size}, (_, i) => `x_{${i+1}}`);
        const variablesLatex = `\\[${variables.join(',\\;')} \\quad b\\]`;
        inputMatrixDiv.innerHTML = `${variablesLatex}\\[${formatMatrix(matrix)}\\]`;
        MathJax.typeset([inputMatrixDiv]);
    }

    return matrix;
}

function formatMatrix(matrix) {
    const rows = matrix.map(row => row.map(val => val.toString()).join(' & ')).join(' \\\\ ');
    return `\\begin{bmatrix} ${rows} \\end{bmatrix}`;
}

function solveEquations() {
    const matrix = getMatrixValues();
    const size = matrix.length;
    const steps = [];

    // Make a copy of the matrix for manipulation
    let augmentedMatrix = matrix.map(row => [...row].map(val => new Fraction(val)));

    // Forward elimination
    for (let pivotRow = 0; pivotRow < size; pivotRow++) {

        // Find pivot
        let maxRow = pivotRow;
        for (let row = pivotRow + 1; row < size; row++) {
            if (Math.abs(augmentedMatrix[row][pivotRow]) > Math.abs(augmentedMatrix[maxRow][pivotRow])) {
                maxRow = row;
            }
        }

        // Swap rows if necessary
        if (maxRow !== pivotRow) {
            [augmentedMatrix[pivotRow], augmentedMatrix[maxRow]] = [augmentedMatrix[maxRow], augmentedMatrix[pivotRow]];
            steps.push({
                description: `Swap row ${toRoman(pivotRow + 1)} with row ${toRoman(maxRow + 1)}`,
                matrix: `\\[${formatMatrix(augmentedMatrix)}\\]`
            });
        }

        // Check for singular matrix
        if (Math.abs(augmentedMatrix[pivotRow][pivotRow]) < 1e-10) {
            displaySolution([{
                description: 'The system has no unique solution (singular matrix)',
                matrix: ''
            }]);
            return;
        }

        const pivot = augmentedMatrix[pivotRow][pivotRow];

        let isEliminated = true;
        for(let row = pivotRow + 1; row < size; row++){
            if (augmentedMatrix[row][pivotRow].numerator !== 0) {
                isEliminated = false;
                break;
            }   
        }

        if ((((pivot.valueOf() !== 0) ) & (pivotRow+1 < size)) & (!isEliminated)) {
            steps.push({
                description: `Starting elimination for column ${pivotRow + 1}`,
                matrix: `\\[${formatMatrix(augmentedMatrix)}\\]`
            });
        }
       
        

        // Eliminate column
        for (let j = pivotRow + 1; j < size; j++) {
            
            const elementToEliminate = augmentedMatrix[j][pivotRow];
            if ((pivot.valueOf() === 0) || (elementToEliminate == 0)) {
                continue; // Skip if pivot is zero to avoid division by zero or if element to eliminate belor pivot is already zero
            }
            
            const factor = new Fraction(elementToEliminate.toString())
            factor.divide(pivot);
            
            // Perform row operation
            for (let k = pivotRow; k <= size; k++) {
                const subtraction = new Fraction(factor.toString());
                subtraction.multiply(augmentedMatrix[pivotRow][k]);
                augmentedMatrix[j][k].subtract(subtraction);
            }
            
            // Add step to the steps array
            steps.push({
                description: `${toRoman(j + 1)} - ${factor} × ${toRoman(pivotRow + 1)}`,
                matrix: `${formatMatrix(augmentedMatrix)}`
            });
        }
    }

    // Back substitution
    const solution = new Array(size);
    steps.push({
        description: 'Starting back substitution:',
        matrix: `\\[${formatMatrix(augmentedMatrix)}\\]`
    });

    for (let pivotRow = size - 1; pivotRow >= 0; pivotRow--) {
        let sum = new Fraction(0);
        let equation = [];

        const pivot = new Fraction(augmentedMatrix[pivotRow][pivotRow].toString());

        // Build equation string
        equation.push(`x_{${pivotRow+1}} = `);

        let text = ` \\frac{${augmentedMatrix[pivotRow][size]}}{${pivot}}`;
        if (pivot.valueOf() === 1){
            text = ` ${augmentedMatrix[pivotRow][size]}`;
        }
        equation.push(text);

        for (let j = pivotRow + 1; j < size; j++) {
            if (solution[j] && solution[j].valueOf() !== 0) {
                const coeff = new Fraction(augmentedMatrix[pivotRow][j].toString());
                coeff.multiply(solution[j]);
                sum.add(coeff);

                let text = ` - \\frac{${augmentedMatrix[pivotRow][j]}}{${pivot}} \\cdot x_{${j+1}}`;
                if (pivot.valueOf() === 1){
                    text = ` - ${augmentedMatrix[pivotRow][j]} \\cdot x_{${j+1}}`;
                }
                equation.push(text);
                
            }
        }

        solution[pivotRow] = new Fraction(augmentedMatrix[pivotRow][size].toString());
        solution[pivotRow].subtract(sum);
        solution[pivotRow].divide(augmentedMatrix[pivotRow][pivotRow]);

        steps.push({
            description: `\\[\\text{Computing } x_{${pivotRow+1}}:\\]`,
            matrix: `\\[${equation.join(' ')} = ${solution[pivotRow]}\\]`
        });
    }

    // Add final solution to steps
    const solutionLatex = solution.map((x, i) => `x_{${i+1}} = ${x}`).join(', \\; \\;');
    steps.push({
        description: 'Final solution:',
        matrix: `\\[${solutionLatex}\\]`
    });

    displaySolution(steps);
}

// Function to display solution steps
function displaySolution(steps) {
    const solutionDiv = document.getElementById('solution-steps');
    solutionDiv.innerHTML = '';

    steps.forEach((step, index) => {
        const stepDiv = document.createElement('div');
        stepDiv.className = 'step';

        const description = document.createElement('div');
        description.className = 'step-description';
        description.textContent = step.description;
        stepDiv.appendChild(description);

        const matrix = document.createElement('div');
        matrix.className = 'step-matrix';
        matrix.innerHTML = step.matrix;
        console.log(step.matrix);
        stepDiv.appendChild(matrix);

        solutionDiv.appendChild(stepDiv);
        MathJax.typeset();
    });
}

// Initialize the matrix when the page loads
window.onload = () => {
    updateMatrixSize();
};

function toRoman(num) {
    const romanNumerals = [
        { value: 10, numeral: 'X' },
        { value: 9, numeral: 'IX' },
        { value: 5, numeral: 'V' },
        { value: 4, numeral: 'IV' },
        { value: 1, numeral: 'I' }
    ];
    
    let result = '';
    for (let i = 0; i < romanNumerals.length; i++) {
        while (num >= romanNumerals[i].value) {
            result += romanNumerals[i].numeral;
            num -= romanNumerals[i].value;
        }
    }
    return result;
}