// CascadeEngine.js

class CascadeEngine {
    constructor(symbols) {
        this.symbols = symbols;
    }

    cascade(grid) {
        const rows = grid.length;
        const cols = grid[0].length;

        const dropData = [];

        for (let col = 0; col < cols; col++) {

            let writeRow = rows - 1;

            // Move existing symbols down
            for (let row = rows - 1; row >= 0; row--) {

                if (grid[row][col] !== null) {

                    const symbol =
                        grid[row][col];

                    grid[row][col] = null;

                    grid[writeRow][col] =
                        symbol;

                    if (row !== writeRow) {
                        dropData.push({
                            symbol,
                            fromRow: row,
                            toRow: writeRow,
                            col
                        });
                    }

                    writeRow--;
                }
            }

            // Fill empty cells with new symbols
            while (writeRow >= 0) {

                const symbol =
                    this.randomSymbol();

                grid[writeRow][col] =
                    symbol;

                dropData.push({
                    symbol,
                    fromRow: -1,
                    toRow: writeRow,
                    col
                });

                writeRow--;
            }
        }

        return {
            grid,
            dropData
        };
    }

    randomSymbol() {
        return this.symbols[
            Math.floor(
                Math.random() *
                this.symbols.length
            )
        ];
    }
}

export default CascadeEngine;