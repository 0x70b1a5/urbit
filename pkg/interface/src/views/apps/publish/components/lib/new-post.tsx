import React from "react";
import { FormikHelpers } from "formik";
import GlobalApi from "~/logic/api/global";
import { useWaitForProps } from "~/logic/lib/useWaitForProps";
import { RouteComponentProps } from "react-router-dom";
import { PostForm, PostFormSchema } from "./NoteForm";
import {createPost} from "~/logic/api/graph";
import {Graph} from "~/types/graph-update";
import {Association} from "~/types";

interface NewPostProps {
  api: GlobalApi;
  book: string;
  ship: string;
  graph: Graph;
  association: Association;
}

export default function NewPost(props: NewPostProps & RouteComponentProps) {
  const { api, book, association, ship, history } = props;

  const waiter = useWaitForProps(props, 20000);

  const onSubmit = async (
    values: PostFormSchema,
    actions: FormikHelpers<PostFormSchema>
  ) => {
    const { title, body } = values;
    try {
      const post = createPost([{ text: title }, { text: body }])
      const noteId = parseInt(post.index.split('/')[1], 10);
      await api.graph.addPost(ship, book, post)
      await waiter(p => {
        const { graph } = p;
        return graph.has(noteId);
      });
      history.push(`/~publish/notebook/ship/${ship}/${book}/note/${noteId}`);
    } catch (e) {
      console.error(e);
      actions.setStatus({ error: "Posting note failed" });
    }
  };

  const initialValues: PostFormSchema = {
    title: "",
    body: "",
  };

  return (
    <PostForm
      initial={initialValues}
      onSubmit={onSubmit}
      submitLabel={`Publish to ${association?.metadata?.title}`}
      loadingText="Posting..."
    />
  );
}
