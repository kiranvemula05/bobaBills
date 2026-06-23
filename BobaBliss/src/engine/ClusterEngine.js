import gameConfig from "../games/suger-rush/config.js";

class ClusterEngine {
    constructor(minClusterSize = 8) {
        this.minClusterSize = minClusterSize;
    }

    findClusters(grid) {
        const minCluster = gameConfig.minClusterSize;
        const rows = grid.length;
        const cols = grid[0].length;

        const visited = Array(rows)
            .fill(false)
            .map(() =>
                Array(cols).fill(false)
            );

        const clusters = [];

        const dfs = (
            row,
            col,
            symbol,
            cluster
        ) => {

            if (
                row < 0 ||
                row >= rows ||
                col < 0 ||
                col >= cols
            ) {
                return;
            }

            if (visited[row][col]) {
                return;
            }

            if (
                grid[row][col] !== symbol
            ) {
                return;
            }

            visited[row][col] = true;

            cluster.push({
                row,
                col
            });

            dfs(
                row + 1,
                col,
                symbol,
                cluster
            );

            dfs(
                row - 1,
                col,
                symbol,
                cluster
            );

            dfs(
                row,
                col + 1,
                symbol,
                cluster
            );

            dfs(
                row,
                col - 1,
                symbol,
                cluster
            );
        };

        for (
            let row = 0;
            row < rows;
            row++
        ) {

            for (
                let col = 0;
                col < cols;
                col++
            ) {

                if (
                    visited[row][col]
                ) continue;

                const symbol =
                    grid[row][col];

                const cluster = [];

                dfs(
                    row,
                    col,
                    symbol,
                    cluster
                );

                if (
                    cluster.length >=
                    this.minClusterSize
                ) {

                    clusters.push({
                        symbol,
                        positions: cluster,
                        count:
                            cluster.length
                    });
                }
            }
        }

        return clusters;
    }
}

export default ClusterEngine;