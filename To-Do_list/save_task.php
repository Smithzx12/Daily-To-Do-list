<?php
$data = file_get_contents('php://input');
file_put_contents('data_task.json', $data);
echo 'ok';
?>