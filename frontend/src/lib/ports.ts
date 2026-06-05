type NumberedPort = {
    id: number;
};

export function byDeviceLayoutPortOrder<T extends NumberedPort>(ports: T[]): T[] {
    return [...ports].sort((a, b) => {
        const rowA = a.id % 2 === 0 ? 0 : 1;
        const rowB = b.id % 2 === 0 ? 0 : 1;

        if (rowA !== rowB) return rowA - rowB;

        return a.id - b.id;
    });
}
