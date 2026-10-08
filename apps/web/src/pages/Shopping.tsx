import { useMemo, useState } from 'react';
import { useAuth } from '../lib/auth';
import { spaceColor } from '../lib/color';
import { useItems, useLists, useMutate, usePresence, useSpace } from '../lib/data';
import { useDialog } from '../lib/dialog';
import type { ShoppingItem, ShoppingList } from '../lib/types';
import { addItems, clearChecked, createList, deleteList, toggleItem } from './shopping/shoppingCommands';
import { ListBody } from './shopping/ListBody';
import { ListChips } from './shopping/ListChips';

function NoLists({
  scoped,
  canCreate,
  onCreate,
}: {
  scoped: boolean;
  canCreate: boolean;
  onCreate: () => void;
}) {
  return (
    <div className="empty">
      Nessuna lista{scoped ? '' : ' in questa vista'}.<br />
      {canCreate && (
        <button className="btn small" style={{ marginTop: 12 }} onClick={onCreate}>
          Crea la prima lista
        </button>
      )}
    </div>
  );
}

/** Spesa condivisa: liste per spazio, voci raggruppate per reparto, aggiornamento in tempo reale. */
export function ShoppingPage() {
  const { session } = useAuth();
  const userId = session!.user.id;
  const { selected, spaces, defaultSpace, canWrite, spaceById } = useSpace();
  const { data: lists = [] } = useLists();
  const { data: items = [] } = useItems();
  const mutate = useMutate();
  const dialog = useDialog();
  const [listId, setListId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const visibleLists = lists.filter((l) => selected === 'all' || l.space_id === selected);
  const list: ShoppingList | undefined = visibleLists.find((l) => l.id === listId) ?? visibleLists[0];
  const space = list ? spaceById(list.space_id) : defaultSpace;
  const writable = canWrite(list?.space_id ?? defaultSpace?.id);
  const others = usePresence(list?.space_id, 'spesa');

  const mine = useMemo(() => items.filter((i) => i.list_id === list?.id), [items, list?.id]);
  const todo = mine.filter((i) => !i.checked);
  const done = mine.filter((i) => i.checked);

  async function onCreateList(name: string) {
    const spaceId = selected === 'all' ? defaultSpace?.id : selected;
    if (!spaceId) {
      return;
    }
    const id = await createList(mutate, spaceId, name);
    setAdding(false);
    setListId(id);
  }

  async function onDeleteList() {
    if (!list) {
      return;
    }
    const confirmed = await dialog.confirm({
      title: `Eliminare «${list.name}»?`,
      message: 'Spariscono anche tutte le sue voci.',
      confirmLabel: 'Elimina',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    await deleteList(mutate, list);
    setListId(null);
  }

  const onToggle = (item: ShoppingItem) => {
    if (writable) {
      void toggleItem(mutate, item, userId);
    }
  };

  return (
    <div style={{ ['--space' as string]: spaceColor(space?.color_hue) }}>
      <h2 className="page-title">Spesa</h2>
      <ListChips
        lists={visibleLists}
        items={items}
        activeId={list?.id}
        showSpaceDot={selected === 'all'}
        spaceById={spaceById}
        canAdd={writable}
        adding={adding}
        onAdding={setAdding}
        onPick={setListId}
        onCreate={(name) => void onCreateList(name)}
      />
      {others.length > 0 && (
        <div className="presence" role="status">
          <span className="dot" style={{ background: 'var(--accent)' }} />
          {others.join(', ')} {others.length > 1 ? 'sono' : 'è'} nella lista
        </div>
      )}
      {list ? (
        <ListBody
          todo={todo}
          done={done}
          writable={writable}
          onToggle={onToggle}
          onAdd={(text) => void addItems(mutate, list, text, userId)}
          onClearChecked={() => void clearChecked(mutate, done)}
          onDeleteList={onDeleteList}
        />
      ) : (
        <NoLists
          scoped={selected !== 'all' || spaces.length === 1}
          canCreate={writable}
          onCreate={() => setAdding(true)}
        />
      )}
    </div>
  );
}
