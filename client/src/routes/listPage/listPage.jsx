import "./listPage.scss";
import Filter from "../../components/filter/Filter";
import Card from "../../components/card/Card";
import Map from "../../components/map/Map";
import { Await, useLoaderData, useSearchParams } from "react-router-dom";
import { Suspense, useEffect, useState } from "react";
import apiRequest from "../../lib/apiRequest";

function ListPage() {
  const initialData = useLoaderData();
  const [searchParams] = useSearchParams();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch posts when search params change
  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const queryString = searchParams.toString();
        const response = await apiRequest(`/posts${queryString ? `?${queryString}` : ''}`);
        setPosts(response.data);
      } catch (err) {
        console.error('Failed to fetch posts:', err);
        setError(err);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [searchParams]);

  // Initialize with loader data
  useEffect(() => {
    if (initialData?.postResponse) {
      initialData.postResponse.then(response => {
        if (!searchParams.toString()) { // Only use initial data if no search params
          setPosts(response.data);
        }
      }).catch(err => {
        console.error('Failed to load initial data:', err);
        setError(err);
      });
    }
  }, [initialData, searchParams]);

  const renderPosts = () => {
    if (loading) {
      return <p>Loading...</p>;
    }
    
    if (error) {
      return <p>Error loading posts!</p>;
    }
    
    if (!posts || posts.length === 0) {
      return (
        <div className="emptyState">
          <h3>No properties found</h3>
          <p>Try adjusting your search filters to find more properties.</p>
        </div>
      );
    }
    
    return posts.map((post) => <Card key={post.id} item={post} />);
  };

  const renderMap = () => {
    if (loading) {
      return <p>Loading map...</p>;
    }
    
    if (error) {
      return <p>Error loading map!</p>;
    }
    
    if (!posts || posts.length === 0) {
      return (
        <div className="emptyMapState">
          <h3>No locations to display</h3>
          <p>Search for properties to see them on the map.</p>
        </div>
      );
    }
    
    return <Map items={posts} />;
  };

  return (
    <div className="listPage">
      <div className="listContainer">
        <div className="wrapper">
          <Filter />
          {renderPosts()}
        </div>
      </div>
      <div className="mapContainer">
        {renderMap()}
      </div>
    </div>
  );
}

export default ListPage;
