import './list.scss'
import Card from"../card/Card"

function List({ posts, emptyMessage = "No properties found", emptySubMessage = "" }) {
  if (!posts || posts.length === 0) {
    return (
      <div className='list emptyList'>
        <div className="emptyState">
          <h3>{emptyMessage}</h3>
          {emptySubMessage && <p>{emptySubMessage}</p>}
        </div>
      </div>
    );
  }
  
  return (
    <div className='list'>
      {posts.map(item=>(
        <Card key={item.id} item={item}/>
      ))}
    </div>
  )
}

export default List