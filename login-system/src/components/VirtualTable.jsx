import React from 'react';
import { FixedSizeList } from 'react-window';

// This component renders a virtualized list of rows.
// It's designed to be used with a CSS Grid-based table layout.
const VirtualTable = ({ items, renderRow, height = 400, rowHeight = 55 }) => {
  // The Row component clones the <tr> returned by renderRow
  // and injects the style prop required by react-window.
  const Row = ({ index, style }) => {
    const row = renderRow(items[index], index);
    return React.cloneElement(row, {
      style: { ...row.props.style, ...style },
    });
  };

  return (
    <FixedSizeList
      height={height}
      itemCount={items.length}
      itemSize={rowHeight}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
};

export default VirtualTable;
