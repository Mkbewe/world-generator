import type {
  LayerTreeNode,
  MapBaseLayerId,
  MapLayerNavigation,
  MapLayerNode,
  MapLayerOption,
} from '../../utils/map-renderer';

interface NavigationLeaf {
  readonly id: MapBaseLayerId;
  readonly label: string;
}

interface NavigationGroup {
  readonly id: MapBaseLayerId;
  readonly label: string;
  readonly children: readonly NavigationLeaf[];
  selectedChild?: MapBaseLayerId;
}

type NavigationNode = NavigationLeaf | NavigationGroup;

function isGroup(node: NavigationNode): node is NavigationGroup {
  return 'children' in node;
}

/** Each group remembers one selected leaf; rendering and UI use the same tree. */
export class LayerNavigation {
  private readonly roots: readonly NavigationNode[];
  private readonly paths = new Map<MapBaseLayerId, readonly NavigationNode[]>();

  constructor(tree: readonly LayerTreeNode[], saved: readonly MapLayerNode[] = []) {
    const savedById = new Map<MapBaseLayerId, MapLayerNode>();
    indexSavedNodes(saved, savedById);
    this.roots = tree.map(node => createNode(node, savedById));
    for (const root of this.roots) {
      this.paths.set(root.id, [root]);
      if (isGroup(root)) {
        for (const child of root.children) {
          this.paths.set(child.id, [root, child]);
        }
      }
    }
  }

  /** Points the owning group at the given leaf. */
  select(id: MapBaseLayerId): void {
    const [root, child] = this.paths.get(id) ?? [];
    if (root && isGroup(root) && child) {
      root.selectedChild = child.id;
    }
  }

  /** True when a leaf is a top-level tab or the selected child of its group. */
  leadsToSelection(id: MapBaseLayerId): boolean {
    const path = this.paths.get(id);
    if (!path) {
      return false;
    }
    const [root, child] = path;
    return !isGroup(root) || child?.id === root.selectedChild;
  }

  toViewState(
    layers: readonly MapLayerOption<MapBaseLayerId>[],
    displayedLayer?: MapBaseLayerId
  ): MapLayerNavigation {
    const available = new Set(layers.filter(layer => layer.available).map(layer => layer.id));
    const displayedPath = displayedLayer ? this.paths.get(displayedLayer) : undefined;

    return {
      tabs: this.roots.map(root => projectNode(root, available, displayedPath)),
      activeTab: displayedPath?.[0]?.id,
    };
  }
}

function indexSavedNodes(
  nodes: readonly MapLayerNode[],
  target: Map<MapBaseLayerId, MapLayerNode>
): void {
  for (const node of nodes) {
    target.set(node.id, node);
    if (node.children) {
      indexSavedNodes(node.children, target);
    }
  }
}

function createNode(
  node: LayerTreeNode,
  savedById: ReadonlyMap<MapBaseLayerId, MapLayerNode>
): NavigationNode {
  const remembered = savedById.get(node.id);
  if (!node.children) {
    return { id: node.id, label: node.label };
  }

  return {
    id: node.id,
    label: node.label,
    children: node.children.map(child => ({ id: child.id, label: child.label })),
    selectedChild: resolveRememberedChild(node.children, remembered?.selectedChild),
  };
}

/** Keeps a remembered child while it exists, otherwise falls back to the first child. */
function resolveRememberedChild(
  children: readonly NavigationLeaf[],
  remembered?: MapBaseLayerId
): MapBaseLayerId | undefined {
  const match = children.find(child => child.id === remembered);
  return (match ?? children[0])?.id;
}

function projectNode(
  node: NavigationNode,
  available: ReadonlySet<MapBaseLayerId>,
  displayedPath?: readonly NavigationNode[]
): MapLayerNode {
  if (!isGroup(node)) {
    return {
      id: node.id,
      label: node.label,
      available: available.has(node.id),
      selectedLayer: node.id,
    };
  }

  const children = node.children.map(child => ({
    id: child.id,
    label: child.label,
    available: available.has(child.id),
    selectedLayer: child.id,
  }));
  const displayedChild = displayedPath?.[0] === node ? displayedPath[1]?.id : undefined;
  const selectedChild = displayedChild ?? node.selectedChild;
  const selected = children.find(child => child.id === selectedChild);
  const target = selected?.available
    ? selected
    : (children.find(child => child.available) ?? selected);

  return {
    id: node.id,
    label: node.label,
    available: children.some(child => child.available),
    children,
    selectedChild,
    selectedLayer: target?.selectedLayer ?? node.id,
  };
}
