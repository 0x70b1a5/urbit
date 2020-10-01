import React, { PureComponent } from "react";
import { Link, RouteComponentProps, Route, Switch } from "react-router-dom";
import { NotebookPosts } from "./NotebookPosts";
import { Subscribers } from "./Subscribers";
import { Settings } from "./Settings";
import { Spinner } from "~/views/components/Spinner";
import { Tabs, Tab } from "~/views/components/Tab";
import { roleForShip } from "~/logic/lib/group";
import { Box, Button, Text, Row } from "@tlon/indigo-react";
import { Notebook as INotebook } from "~/types/publish-update";
import { Groups } from "~/types/group-update";
import { Contacts, Rolodex } from "~/types/contact-update";
import GlobalApi from "~/logic/api/global";
import styled from "styled-components";
import { Associations, Graph, Association } from "~/types";
import { deSig } from "~/logic/lib/util";

interface NotebookProps {
  api: GlobalApi;
  ship: string;
  book: string;
  graph: Graph;
  notebookContacts: Contacts;
  association: Association;
  associations: Associations;
  contacts: Rolodex;
  groups: Groups;
  hideNicknames: boolean;
}

interface NotebookState {
  isUnsubscribing: boolean;
  tab: string;
}

export class Notebook extends PureComponent<
  NotebookProps & RouteComponentProps,
  NotebookState
> {
  constructor(props) {
    super(props);
    this.state = {
      isUnsubscribing: false,
      tab: "all",
    };
    this.setTab = this.setTab.bind(this);
  }

  setTab(tab: string) {
    this.setState({ tab });
  }

  render() {
    const {
      api,
      ship,
      book,
      notebookContacts,
      groups,
      history,
      hideNicknames,
      associations,
      association,
      graph
    } = this.props;
    const { state } = this;
    const { metadata } = association;

    const group = groups[association?.['group-path']];
    if (!group) return null; // Waitin on groups to populate

    const contact = notebookContacts[ship];
    const role = group ? roleForShip(group, window.ship) : undefined;
    const isOwn = `~${window.ship}` === ship;
    const isAdmin = role === "admin" || isOwn;

    const isWriter =
      isOwn || group.tags?.publish?.[`writers-${book}`]?.has(window.ship);

    const showNickname = contact?.nickname && !hideNicknames;

    return (
      <Box
        pt={4}
        mx="auto"
        display="grid"
        gridAutoRows="min-content"
        gridTemplateColumns={["100%", "1fr 1fr"]}
        maxWidth="500px"
        gridRowGap={[4, 6]}
        gridColumnGap={3}
      >
        <Box display={["block", "none"]} gridColumn={["1/2", "1/3"]}>
          <Link to="/~publish">{"<- All Notebooks"}</Link>
        </Box>
        <Box>
          <Text> {metadata?.title}</Text>
          <br />
          <Text color="lightGray">by </Text>
          <Text fontFamily={showNickname ? "sans" : "mono"}>
            {showNickname ? contact?.nickname : ship}
          </Text>
        </Box>
        <Row justifyContent={["flex-start", "flex-end"]}>
          {isWriter && (
            <Link to={`/~publish/notebook/ship/${ship}/${book}/new`}>
              <Button primary>New Post</Button>
            </Link>
          )}
          {!isOwn ? (
            this.state.isUnsubscribing ? (
              <Spinner
                awaiting={this.state.isUnsubscribing}
                classes="mt2 ml2"
                text="Unsubscribing..."
              />
            ) : (
              <Button
                ml={isWriter ? 2 : 0}
                destructive
                onClick={() => {
                  this.setState({ isUnsubscribing: true });

                  api.graph.leaveGraph(ship, book)
                    .then(() => {
                      history.push("/~publish");
                    })
                    .catch(() => {
                      this.setState({ isUnsubscribing: false });
                    });
                }}
              >
                Unsubscribe
              </Button>
            )
          ) : null}
        </Row>
        <Box gridColumn={["1/2", "1/3"]}>
          <Tabs>
            <Tab
              selected={state.tab}
              setSelected={this.setTab}
              label="All Posts"
              id="all"
            />
            <Tab
              selected={state.tab}
              setSelected={this.setTab}
              label="About"
              id="about"
            />
            {isAdmin && (
              <>
                <Tab
                  selected={state.tab}
                  setSelected={this.setTab}
                  label="Subscribers"
                  id="subscribers"
                />
                <Tab
                  selected={state.tab}
                  setSelected={this.setTab}
                  label="Settings"
                  id="settings"
                />
              </>
            )}
          </Tabs>
          {state.tab === "all" && (
            <NotebookPosts
              graph={graph}
              host={ship}
              book={book}
              contacts={notebookContacts}
              hideNicknames={hideNicknames}
            />
          )}
          {state.tab === "about" && (
            <Box mt="3" color="black">
              {metadata?.description}
            </Box>
          )}
          {state.tab === "subscribers" && (
            <Subscribers
              book={book}
              api={api}
              groups={groups}
              associations={associations}
              association={association}
              contacts={{}}
            />
          )}
          {state.tab === "settings" && (
            <Settings
              host={ship}
              book={book}
              api={api}
              contacts={notebookContacts}
              associations={associations}
              association={association}
              groups={groups}
            />
          )}
        </Box>
      </Box>
    );
  }
}
export default Notebook;
