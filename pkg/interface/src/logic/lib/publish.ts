import { Post, GraphNode, TextContent, Graph, NodeMap } from "~/types";

const buntPost = (): Post => ({
  author: '',
  contents: [],
  hash: null,
  index: '',
  signatures: [],
  'time-sent': 0
});

export function makeNodeMap(posts: Post[]): Record<string, GraphNode> {
  let nodes = {};
  posts.forEach((p) => {
    nodes[p.index] = { children: { empty: null }, post: p };
  });
  return nodes;
}

export function newPost(
  title: string,
  body: string
): [number, NodeMap] {
  const now = Date.now();
  const root: Post = {
    author: `~${window.ship}`,
    index: "/" + now,
    "time-sent": now,
    contents: [],
    hash: null,
    signatures: [],
  };

  const revContainer: Post = { ...root, index: root.index + "/1" };
  const commentsContainer = { ...root, index: root.index + "/2" };

  const firstRevision: Post = {
    ...revContainer,
    index: revContainer.index + "/1",
    contents: [{ text: title }, { text: body }],
  };

  const nodes = {
    [root.index]: {
      post: root,
      children: {
        graph: {
          1: {
            post: revContainer,
            children: {
              graph: {
                1: {
                  post: firstRevision,
                  children: { empty: null },
                },
              },
            },
          },
          2: {
            post: commentsContainer,
            children: { empty: null },
          },
        },
      },
    },
  };

  return [now, nodes];
}

export function editPost(rev: number, noteId: number, title: string, body: string) {
  const now = Date.now();
  const newRev: Post = {
    author: `~${window.ship}`,
    index: `/${noteId}/1/${rev}`,
    "time-sent": now,
    contents: [{ text: title }, { text: body }],
    hash: null,
    signatures: [],
  };
  const nodes = {
    [newRev.index]: {
      post: newRev,
      children: { empty: null }
    }
  };

  return nodes;
}

export function getLatestRevision(node: GraphNode): [number, string, string, Post] {
  const revs = node.children.get(1);
  const empty = [1, "", "", buntPost()] as [number, string, string, Post];
  if(!revs) {
    return empty;
  }
  const [revNum, rev] = [...revs.children][0];
  if(!rev) {
    return empty
  }
  const [title, body] = rev.post.contents as TextContent[];
  return [revNum, title.text, body.text, rev.post];
}

export function getComments(node: GraphNode): GraphNode {
  const comments = node.children.get(2);
  if(!comments) {
    return { post: buntPost(), children: new Map() } 
  }
  return comments;
}

export function getSnippet(body: string) {
  const start = body.slice(0, 400);
  return start === body ? start : `${start}...`;
}
 
